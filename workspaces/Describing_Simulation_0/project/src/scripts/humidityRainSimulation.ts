import fs from 'node:fs';
import path from 'node:path';

import { ComponentManager } from 'src/core/components/ComponentManager';
import { EntityManager } from 'src/core/entity/EntityManager';
import { SystemManager } from 'src/core/systems/SystemManager';
import { SimulationPlayer } from 'src/core/simplayer/SimulationPlayer';
import { EvaluationPlayer } from 'src/core/evalplayer/EvaluationPlayer';
import { Bus } from 'src/core/messaging/Bus';
import type { SnapshotFrame } from 'src/core/IOPlayer';
import {
  createDefaultSchedule,
  defaultParameters,
  initializeHumidityRainSimulation,
  type HumidityRainSimulationOptions,
} from 'src/plugins/humidityRain/setup';
import {
  ATMOSPHERE_COMPONENT,
  AIR_TEMPERATURE_COMPONENT,
  RAIN_STATE_COMPONENT,
  type AtmosphereComponent,
  type AirTemperatureComponent,
  type HumidityResponseParametersComponent,
  type RainStateComponent,
} from 'src/plugins/humidityRain';
import type { RainScheduleEntry } from 'src/plugins/humidityRain/systems/RainScheduleSystem';

interface SimulationConfig {
  readonly durationSeconds: number;
  readonly stepSeconds: number;
  readonly schedule: RainScheduleEntry[];
  readonly parameters: HumidityResponseParametersComponent;
}

interface TimelineEntry {
  readonly timeSeconds: number;
  readonly relativeHumidity: number;
  readonly relativeHumidityPercent: number;
  readonly rainIntensityMmPerHour: number;
  readonly airTemperatureCelsius: number;
  readonly dewPointCelsius: number;
  readonly specificHumidityGramsPerKg: number;
  readonly rainMemory: number;
}

interface SimulationResult {
  readonly frames: SnapshotFrame[];
  readonly config: SimulationConfig;
  readonly timeline: TimelineEntry[];
}

function executeHumidityRainSimulation(
  options: HumidityRainSimulationOptions = {},
  configOverrides: Partial<Pick<SimulationConfig, 'durationSeconds' | 'stepSeconds'>> = {},
): SimulationResult {
  const durationSeconds = configOverrides.durationSeconds ?? 7200;
  const stepSeconds = configOverrides.stepSeconds ?? 60;

  if (durationSeconds <= 0) {
    throw new Error('Simulation duration must be positive.');
  }
  if (stepSeconds <= 0) {
    throw new Error('Simulation step must be positive.');
  }

  const schedule = options.schedule ? [...options.schedule] : createDefaultSchedule();
  const parameters = options.parameters
    ? { ...defaultParameters(), ...options.parameters }
    : defaultParameters();

  const components = new ComponentManager();
  const entities = new EntityManager(components);
  const systems = new SystemManager();

  const simulationInbound = new Bus();
  const simulationOutbound = new Bus();

  const simulationPlayer = new SimulationPlayer(
    entities,
    components,
    systems,
    simulationInbound,
    simulationOutbound,
  );

  const evaluationComponents = new ComponentManager();
  const evaluationEntities = new EntityManager(evaluationComponents);
  const evaluationSystems = new SystemManager();
  const evaluationOutbound = new Bus();

  const evaluationPlayer = new EvaluationPlayer(
    evaluationEntities,
    evaluationComponents,
    evaluationSystems,
    simulationOutbound,
    evaluationOutbound,
  );

  const evaluationFrames: SnapshotFrame[] = [];
  evaluationOutbound.subscribe('evaluation/frame', (frame) => {
    evaluationFrames.push(frame as SnapshotFrame);
  });

  initializeHumidityRainSimulation(entities, components, systems, {
    ...options,
    schedule,
    parameters,
  });

  // Ensure systems are initialised before snapshotting.
  systems.tick(0);
  evaluationSystems.tick(0);

  const simManual = simulationPlayer as unknown as {
    onTick(deltaSeconds: number, timestamp: number): void;
  };
  const evalManual = evaluationPlayer as unknown as {
    onTick(deltaSeconds: number, timestamp: number): void;
  };

  let currentTimeMs = 0;

  simManual.onTick(0, currentTimeMs);
  evaluationSystems.tick(0);
  evalManual.onTick(0, currentTimeMs);

  const steps = Math.floor(durationSeconds / stepSeconds);
  const remainder = durationSeconds - steps * stepSeconds;

  for (let i = 0; i < steps; i += 1) {
    systems.tick(stepSeconds);
    currentTimeMs += stepSeconds * 1000;
    simManual.onTick(stepSeconds, currentTimeMs);
    evaluationSystems.tick(stepSeconds);
    evalManual.onTick(stepSeconds, currentTimeMs);
  }

  if (remainder > 1e-6) {
    systems.tick(remainder);
    currentTimeMs += remainder * 1000;
    simManual.onTick(remainder, currentTimeMs);
    evaluationSystems.tick(remainder);
    evalManual.onTick(remainder, currentTimeMs);
  }

  const timeline = deriveTimeline(evaluationFrames);

  return {
    frames: evaluationFrames,
    config: {
      durationSeconds,
      stepSeconds,
      schedule,
      parameters,
    },
    timeline,
  };
}

function deriveTimeline(frames: readonly SnapshotFrame[]): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];

  for (const frame of frames) {
    const timeSeconds = (frame.metadata?.timestamp ?? 0) / 1000;
    const entity = frame.payload?.entities?.find((candidate) => candidate.id === 'atmosphere');

    if (!entity) {
      continue;
    }

    const atmosphere = entity.components[ATMOSPHERE_COMPONENT.name] as AtmosphereComponent | undefined;
    const rain = entity.components[RAIN_STATE_COMPONENT.name] as RainStateComponent | undefined;
    const temperature = entity.components[AIR_TEMPERATURE_COMPONENT.name] as AirTemperatureComponent | undefined;

    if (!atmosphere || !rain || !temperature) {
      continue;
    }

    timeline.push({
      timeSeconds,
      relativeHumidity: atmosphere.relativeHumidity,
      relativeHumidityPercent: atmosphere.relativeHumidity * 100,
      rainIntensityMmPerHour: rain.intensityMmPerHour,
      airTemperatureCelsius: temperature.airTemperatureCelsius,
      dewPointCelsius: atmosphere.dewPointCelsius,
      specificHumidityGramsPerKg: atmosphere.specificHumidity * 1000,
      rainMemory: atmosphere.rainMemory,
    });
  }

  return timeline;
}

function writeSimulationResult(result: SimulationResult): string {
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
  const outputDir = path.join(
    repoRoot,
    'verifications',
    'humidity_rain_simulation',
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'raw_output.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  return outputPath;
}

if (require.main === module) {
  const result = executeHumidityRainSimulation();
  const outputPath = writeSimulationResult(result);
  // eslint-disable-next-line no-console
  console.log(`Humidity rain simulation output written to ${outputPath}`);
}

export { executeHumidityRainSimulation, writeSimulationResult };
