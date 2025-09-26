import { ComponentManager } from 'src/core/components/ComponentManager';
import { EntityManager } from 'src/core/entity/EntityManager';
import { SystemManager } from 'src/core/systems/SystemManager';
import { TimeSystem } from 'src/core/systems/TimeSystem';
import {
  AIR_TEMPERATURE_COMPONENT,
  ATMOSPHERE_COMPONENT,
  HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
  RAIN_STATE_COMPONENT,
  type AirTemperatureComponent,
  type AtmosphereComponent,
  type HumidityResponseParametersComponent,
} from './components';
import {
  RainScheduleSystem,
  type RainScheduleEntry,
} from './systems/RainScheduleSystem';
import { TemperatureResponseSystem } from './systems/TemperatureResponseSystem';
import { HumidityResponseSystem } from './systems/HumidityResponseSystem';
import { dewPoint, specificHumidity } from './utils/psychrometrics';

export interface HumidityRainSimulationOptions {
  readonly entityId?: string;
  readonly schedule?: readonly RainScheduleEntry[];
  readonly initialRelativeHumidity?: number;
  readonly initialTemperatureCelsius?: number;
  readonly parameters?: Partial<HumidityResponseParametersComponent>;
}

export interface HumidityRainSimulationHandles {
  readonly entityId: string;
  readonly timeSystem: TimeSystem;
  readonly rainScheduleSystem: RainScheduleSystem;
  readonly temperatureSystem: TemperatureResponseSystem;
  readonly humiditySystem: HumidityResponseSystem;
}

const DEFAULT_ENTITY_ID = 'atmosphere';

const DEFAULT_PARAMETERS: HumidityResponseParametersComponent = {
  baselineHumidity: 0.6,
  rainSaturationTarget: 0.98,
  baselineTemperatureCelsius: 24,
  rainCoolingTargetCelsius: 18,
  pressureHPa: 1013.25,
  baseRecoveryRate: 1 / 7200,
  rainConvergenceRate: 1 / 900,
  rainHalfSaturationIntensity: 4,
  rainMemoryGainRate: 1 / 300,
  rainMemoryDecayRate: 1 / 1800,
  temperatureResponseRate: 1 / 600,
  memoryCoolingWeight: 0.4,
  rainMemoryConvergenceRate: 1 / 1200,
};

const DEFAULT_SCHEDULE: RainScheduleEntry[] = [
  { timeSeconds: 0, intensityMmPerHour: 0 },
  { timeSeconds: 900, intensityMmPerHour: 0 },
  { timeSeconds: 1500, intensityMmPerHour: 2 },
  { timeSeconds: 2100, intensityMmPerHour: 5 },
  { timeSeconds: 2700, intensityMmPerHour: 8 },
  { timeSeconds: 3300, intensityMmPerHour: 10 },
  { timeSeconds: 3900, intensityMmPerHour: 6 },
  { timeSeconds: 4500, intensityMmPerHour: 3 },
  { timeSeconds: 5100, intensityMmPerHour: 1 },
  { timeSeconds: 5700, intensityMmPerHour: 0.5 },
  { timeSeconds: 6300, intensityMmPerHour: 0 },
  { timeSeconds: 7200, intensityMmPerHour: 0 },
];

export function createDefaultSchedule(): RainScheduleEntry[] {
  return [...DEFAULT_SCHEDULE];
}

export function defaultParameters(): HumidityResponseParametersComponent {
  return { ...DEFAULT_PARAMETERS };
}

export function initializeHumidityRainSimulation(
  entities: EntityManager,
  components: ComponentManager,
  systems: SystemManager,
  options: HumidityRainSimulationOptions = {},
): HumidityRainSimulationHandles {
  const entityId = options.entityId ?? DEFAULT_ENTITY_ID;
  const schedule = options.schedule ?? DEFAULT_SCHEDULE;

  if (!entities.has(entityId)) {
    entities.create(entityId);
  }

  registerComponentDefaults(entityId, components, schedule, options);

  const timeSystem = new TimeSystem(entities, components);
  const rainScheduleSystem = new RainScheduleSystem(
    entityId,
    entities,
    components,
    schedule,
  );
  const temperatureSystem = new TemperatureResponseSystem(entityId, components);
  const humiditySystem = new HumidityResponseSystem(entityId, components);

  systems.register(timeSystem, -20);
  systems.register(rainScheduleSystem, -10);
  systems.register(temperatureSystem, -5);
  systems.register(humiditySystem, 0);

  return {
    entityId,
    timeSystem,
    rainScheduleSystem,
    temperatureSystem,
    humiditySystem,
  };
}

function registerComponentDefaults(
  entityId: string,
  components: ComponentManager,
  schedule: readonly RainScheduleEntry[],
  options: HumidityRainSimulationOptions,
): void {
  const parameters: HumidityResponseParametersComponent = {
    ...DEFAULT_PARAMETERS,
    ...(options.parameters ?? {}),
  };

  if (!components.isRegistered(HUMIDITY_RESPONSE_PARAMETERS_COMPONENT)) {
    components.register(HUMIDITY_RESPONSE_PARAMETERS_COMPONENT);
  }

  components.setComponent(
    entityId,
    HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
    parameters,
  );

  if (!components.isRegistered(AIR_TEMPERATURE_COMPONENT)) {
    components.register(AIR_TEMPERATURE_COMPONENT);
  }

  const initialTemperature =
    options.initialTemperatureCelsius ?? parameters.baselineTemperatureCelsius;

  const temperatureComponent: AirTemperatureComponent = {
    airTemperatureCelsius: initialTemperature,
  };
  components.setComponent(entityId, AIR_TEMPERATURE_COMPONENT, temperatureComponent);

  if (!components.isRegistered(ATMOSPHERE_COMPONENT)) {
    components.register(ATMOSPHERE_COMPONENT);
  }

  const initialRelativeHumidity =
    options.initialRelativeHumidity ?? parameters.baselineHumidity;

  const dewPointCelsius = dewPoint(initialTemperature, initialRelativeHumidity);
  const specificHumidityValue = specificHumidity(
    initialTemperature,
    initialRelativeHumidity,
    parameters.pressureHPa,
  );

  const atmosphereComponent: AtmosphereComponent = {
    relativeHumidity: initialRelativeHumidity,
    dewPointCelsius,
    specificHumidity: specificHumidityValue,
    rainMemory: 0,
  };

  components.setComponent(entityId, ATMOSPHERE_COMPONENT, atmosphereComponent);

  if (!components.isRegistered(RAIN_STATE_COMPONENT)) {
    components.register(RAIN_STATE_COMPONENT);
  }

  components.setComponent(entityId, RAIN_STATE_COMPONENT, {
    intensityMmPerHour: schedule[0]?.intensityMmPerHour ?? 0,
  });
}
