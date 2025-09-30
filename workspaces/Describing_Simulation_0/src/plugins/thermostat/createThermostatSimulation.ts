import { ManualPlayer } from '../../core/player/ManualPlayer.js';
import { Frame } from '../../core/messaging/Frame.js';
import { HVACUsageComponent, OutsideTemperatureComponent, RoomTemperatureComponent, ThermostatComponent } from './components.js';
import { OutsideTemperatureSystem, OutsideTemperatureOptions, RoomThermalResponseSystem, ThermostatControlOptions, ThermostatControlSystem } from './systems.js';

export interface ThermostatSimulationConfig {
  targetTemperatureC: number;
  toleranceC: number;
  initialRoomTemperatureC: number;
  minutesPerTick: number;
  durationMinutes: number;
  heatLossRate: number;
  heatingRatePerMinute: number;
  coolingRatePerMinute: number;
  heatingPowerKw: number;
  coolingPowerKw: number;
  outsideProfile: OutsideTemperatureOptions;
  control: Omit<ThermostatControlOptions, 'minutesPerTick'> & { minutesPerTick?: number };
}

export interface ThermostatSimulationContext {
  player: ManualPlayer;
  roomEntity: number;
  components: {
    roomTemperature: RoomTemperatureComponent;
    thermostat: ThermostatComponent;
    outside: OutsideTemperatureComponent;
    usage: HVACUsageComponent;
  };
  config: ThermostatSimulationConfig;
}

export function createThermostatSimulation(partialConfig: Partial<ThermostatSimulationConfig> = {}): ThermostatSimulationContext {
  const config: ThermostatSimulationConfig = {
    targetTemperatureC: partialConfig.targetTemperatureC ?? 21,
    toleranceC: partialConfig.toleranceC ?? 0.5,
    initialRoomTemperatureC: partialConfig.initialRoomTemperatureC ?? 18,
    minutesPerTick: partialConfig.minutesPerTick ?? 1,
    durationMinutes: partialConfig.durationMinutes ?? 24 * 60,
    heatLossRate: partialConfig.heatLossRate ?? 0.05,
    heatingRatePerMinute: partialConfig.heatingRatePerMinute ?? 0.7,
    coolingRatePerMinute: partialConfig.coolingRatePerMinute ?? 0.6,
    heatingPowerKw: partialConfig.heatingPowerKw ?? 4.5,
    coolingPowerKw: partialConfig.coolingPowerKw ?? 4,
    outsideProfile: {
      minutesPerTick: partialConfig.outsideProfile?.minutesPerTick ?? (partialConfig.minutesPerTick ?? 1),
      cycleMinutes: partialConfig.outsideProfile?.cycleMinutes ?? 24 * 60,
      meanTemperatureC: partialConfig.outsideProfile?.meanTemperatureC ?? 12,
      amplitudeC: partialConfig.outsideProfile?.amplitudeC ?? 6,
      phaseOffsetMinutes: partialConfig.outsideProfile?.phaseOffsetMinutes ?? 0
    },
    control: {
      minimumStateDurationMinutes: partialConfig.control?.minimumStateDurationMinutes ?? 5,
      minutesPerTick: partialConfig.control?.minutesPerTick ?? (partialConfig.minutesPerTick ?? 1)
    }
  };

  const player = new ManualPlayer({ tickIntervalMs: 1 });

  const roomTemperatureComponent = new RoomTemperatureComponent();
  const thermostatComponent = new ThermostatComponent();
  const outsideComponent = new OutsideTemperatureComponent();
  const usageComponent = new HVACUsageComponent();

  const roomEntity = player.entityManager.createEntity();
  player.componentManager.addComponent(roomEntity, roomTemperatureComponent, {
    temperatureC: config.initialRoomTemperatureC
  });
  player.componentManager.addComponent(roomEntity, thermostatComponent, {
    targetTemperatureC: config.targetTemperatureC,
    toleranceC: config.toleranceC,
    state: 'idle'
  });
  player.componentManager.addComponent(roomEntity, outsideComponent, {
    temperatureC: config.outsideProfile.meanTemperatureC
  });
  player.componentManager.addComponent(roomEntity, usageComponent, {
    totalEnergyKwh: 0,
    heatingEnergyKwh: 0,
    coolingEnergyKwh: 0,
    heatingMinutes: 0,
    coolingMinutes: 0
  });

  const outsideSystem = new OutsideTemperatureSystem(
    outsideComponent,
    player.timeSystem,
    player.timeComponent,
    config.outsideProfile
  );

  const controlSystem = new ThermostatControlSystem(thermostatComponent, roomTemperatureComponent, {
    minutesPerTick: config.control.minutesPerTick ?? config.minutesPerTick,
    minimumStateDurationMinutes: config.control.minimumStateDurationMinutes
  });

  const thermalResponseSystem = new RoomThermalResponseSystem(
    roomTemperatureComponent,
    thermostatComponent,
    outsideComponent,
    usageComponent,
    {
      minutesPerTick: config.minutesPerTick,
      heatLossRate: config.heatLossRate,
      heatingRatePerMinute: config.heatingRatePerMinute,
      coolingRatePerMinute: config.coolingRatePerMinute,
      heatingPowerKw: config.heatingPowerKw,
      coolingPowerKw: config.coolingPowerKw
    }
  );

  player.injectSystem(outsideSystem);
  player.injectSystem(controlSystem);
  player.injectSystem(thermalResponseSystem);

  return {
    player,
    roomEntity,
    components: {
      roomTemperature: roomTemperatureComponent,
      thermostat: thermostatComponent,
      outside: outsideComponent,
      usage: usageComponent
    },
    config
  };
}

export function collectFrames(player: ManualPlayer, totalTicks: number): Frame[] {
  const frames: Frame[] = [];
  const unsubscribe = player.outboundBus.subscribe((frame) => {
    frames.push({
      tick: frame.tick,
      entities: { ...frame.entities }
    });
  });

  player.snapshot();
  for (let i = 0; i < totalTicks; i += 1) {
    player.step();
  }

  unsubscribe();
  return frames;
}
