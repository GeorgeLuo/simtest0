import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Frame } from '../core/messaging/Frame.js';
import { createThermostatSimulation, collectFrames } from '../plugins/thermostat/createThermostatSimulation.js';
import { ThermostatComponent, HVACUsageComponent, RoomTemperatureComponent, OutsideTemperatureComponent } from '../plugins/thermostat/components.js';

interface ProcessedPoint {
  tick: number;
  minute: number;
  roomTemperatureC: number | null;
  outsideTemperatureC: number | null;
  thermostatState: string | null;
  cumulativeHeatingMinutes: number | null;
  cumulativeCoolingMinutes: number | null;
  totalEnergyKwh: number | null;
}

function resolveProjectRoot(currentModuleUrl: string): string {
  const currentPath = fileURLToPath(new URL('.', currentModuleUrl));
  return path.resolve(currentPath, '..', '..');
}

function extractComponent<T>(frame: Frame, entityId: number, componentId: string): T | null {
  const entity = frame.entities[entityId];
  if (!entity) {
    return null;
  }
  const component = entity[componentId];
  return (component as T | undefined) ?? null;
}

function processFrames(
  frames: Frame[],
  entityId: number,
  roomComponent: RoomTemperatureComponent,
  thermostatComponent: ThermostatComponent,
  outsideComponent: OutsideTemperatureComponent,
  usageComponent: HVACUsageComponent,
  minutesPerTick: number
): ProcessedPoint[] {
  return frames.map((frame) => {
    const room = extractComponent<{ temperatureC: number }>(frame, entityId, roomComponent.id);
    const thermostat = extractComponent<{ state: string }>(frame, entityId, thermostatComponent.id);
    const outside = extractComponent<{ temperatureC: number }>(frame, entityId, outsideComponent.id);
    const usage = extractComponent<{ heatingMinutes: number; coolingMinutes: number; totalEnergyKwh: number }>(
      frame,
      entityId,
      usageComponent.id
    );

    return {
      tick: frame.tick,
      minute: frame.tick * minutesPerTick,
      roomTemperatureC: room?.temperatureC ?? null,
      outsideTemperatureC: outside?.temperatureC ?? null,
      thermostatState: thermostat?.state ?? null,
      cumulativeHeatingMinutes: usage?.heatingMinutes ?? null,
      cumulativeCoolingMinutes: usage?.coolingMinutes ?? null,
      totalEnergyKwh: usage?.totalEnergyKwh ?? null
    } satisfies ProcessedPoint;
  });
}

function summarize(points: ProcessedPoint[], target: number, tolerance: number, minutesPerTick: number) {
  const temperatures = points
    .map((point) => point.roomTemperatureC)
    .filter((value): value is number => typeof value === 'number');

  const minTemperature = temperatures.length ? Math.min(...temperatures) : null;
  const maxTemperature = temperatures.length ? Math.max(...temperatures) : null;
  const avgTemperature =
    temperatures.length ? temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length : null;

  const withinBandMinutes = points.filter((point) => {
    const value = point.roomTemperatureC;
    if (value === null) {
      return false;
    }
    return value >= target - tolerance && value <= target + tolerance;
  }).length * minutesPerTick;

  const finalPoint = points.at(-1);

  return {
    minTemperatureC: minTemperature,
    maxTemperatureC: maxTemperature,
    averageTemperatureC: avgTemperature,
    minutesWithinTargetBand: withinBandMinutes,
    totalHeatingMinutes: finalPoint?.cumulativeHeatingMinutes ?? null,
    totalCoolingMinutes: finalPoint?.cumulativeCoolingMinutes ?? null,
    totalEnergyKwh: finalPoint?.totalEnergyKwh ?? null
  };
}

async function writeArtifacts(data: ProcessedPoint[], summary: ReturnType<typeof summarize>) {
  const projectRoot = resolveProjectRoot(import.meta.url);
  const artifactsDir = path.join(projectRoot, 'artifacts', 'thermostat');
  await fs.mkdir(artifactsDir, { recursive: true });

  const dataPath = path.join(artifactsDir, 'temperature_history.json');
  const summaryPath = path.join(artifactsDir, 'summary.json');

  await fs.writeFile(dataPath, JSON.stringify({ points: data }, null, 2), 'utf8');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  return { dataPath, summaryPath };
}

async function main() {
  const context = createThermostatSimulation();
  const totalTicks = Math.round(context.config.durationMinutes / context.config.minutesPerTick);
  const frames = collectFrames(context.player, totalTicks);

  const points = processFrames(
    frames,
    context.roomEntity,
    context.components.roomTemperature,
    context.components.thermostat,
    context.components.outside,
    context.components.usage,
    context.config.minutesPerTick
  );
  const summary = summarize(points, context.config.targetTemperatureC, context.config.toleranceC, context.config.minutesPerTick);
  const { dataPath, summaryPath } = await writeArtifacts(points, summary);

  console.log('Thermostat simulation completed.');
  console.log(`Data written to ${dataPath}`);
  console.log(`Summary written to ${summaryPath}`);
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  main().catch((error) => {
    console.error('Failed to run thermostat simulation', error);
    process.exitCode = 1;
  });
}
