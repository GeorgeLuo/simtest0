import { ComponentManager } from '../../core/components/ComponentManager.js';
import { EntityManager } from '../../core/entity/EntityManager.js';
import { System } from '../../core/systems/System.js';
import { TimeComponentType } from '../../core/time/TimeComponent.js';
import { TimeSystem } from '../../core/time/TimeSystem.js';
import {
  HVACUsageComponent,
  HVACUsageData,
  OutsideTemperatureComponent,
  OutsideTemperatureData,
  RoomTemperatureComponent,
  RoomTemperatureData,
  ThermostatComponent,
  ThermostatSettings,
  ThermostatState
} from './components.js';

export interface ThermostatControlOptions {
  minutesPerTick: number;
  minimumStateDurationMinutes?: number;
}

export class ThermostatControlSystem extends System {
  private ticksInState = new Map<number, number>();

  constructor(
    private readonly thermostatComponent: ThermostatComponent,
    private readonly roomTemperatureComponent: RoomTemperatureComponent,
    private readonly options: ThermostatControlOptions
  ) {
    super('thermostat.control-system');
  }

  override update(entityManager: EntityManager, componentManager: ComponentManager): void {
    const entities = componentManager.getEntitiesWith(this.thermostatComponent);
    for (const entity of entities) {
      if (!entityManager.hasEntity(entity)) {
        continue;
      }

      const thermostat = componentManager.getComponent(entity, this.thermostatComponent);
      const room = componentManager.getComponent(entity, this.roomTemperatureComponent);
      if (!thermostat || !room) {
        continue;
      }

      this.updateState(entity, thermostat.data, room.data.temperatureC, thermostat);
    }
  }

  private updateState(
    entity: number,
    settings: ThermostatSettings,
    currentTemperature: number,
    component: { data: ThermostatSettings }
  ): void {
    const desiredState = this.resolveDesiredState(settings, currentTemperature);
    const currentState = settings.state;
    const { minimumStateDurationMinutes = 0, minutesPerTick } = this.options;
    const minimumTicks = Math.max(0, Math.floor(minimumStateDurationMinutes / minutesPerTick));

    const ticksElapsed = this.ticksInState.get(entity) ?? 0;

    if (desiredState === currentState) {
      this.ticksInState.set(entity, ticksElapsed + 1);
      return;
    }

    if (ticksElapsed < minimumTicks) {
      this.ticksInState.set(entity, ticksElapsed + 1);
      return;
    }

    component.data = { ...settings, state: desiredState };
    this.ticksInState.set(entity, 0);
  }

  private resolveDesiredState(settings: ThermostatSettings, currentTemperature: number): ThermostatState {
    if (currentTemperature < settings.targetTemperatureC - settings.toleranceC) {
      return 'heating';
    }
    if (currentTemperature > settings.targetTemperatureC + settings.toleranceC) {
      return 'cooling';
    }
    return 'idle';
  }
}

export interface RoomThermalResponseOptions {
  minutesPerTick: number;
  heatLossRate: number;
  heatingRatePerMinute: number;
  coolingRatePerMinute: number;
  heatingPowerKw: number;
  coolingPowerKw: number;
}

export class RoomThermalResponseSystem extends System {
  constructor(
    private readonly roomTemperatureComponent: RoomTemperatureComponent,
    private readonly thermostatComponent: ThermostatComponent,
    private readonly outsideComponent: OutsideTemperatureComponent,
    private readonly hvacUsageComponent: HVACUsageComponent,
    private readonly options: RoomThermalResponseOptions
  ) {
    super('thermostat.thermal-response');
  }

  override update(entityManager: EntityManager, componentManager: ComponentManager): void {
    const entities = componentManager.getEntitiesWith(this.roomTemperatureComponent);
    for (const entity of entities) {
      if (!entityManager.hasEntity(entity)) {
        continue;
      }

      const room = componentManager.getComponent(entity, this.roomTemperatureComponent);
      const thermostat = componentManager.getComponent(entity, this.thermostatComponent);
      const outside = componentManager.getComponent(entity, this.outsideComponent);
      const hvacUsage = componentManager.getComponent(entity, this.hvacUsageComponent);
      if (!room || !thermostat || !outside || !hvacUsage) {
        continue;
      }

      const updatedRoom = this.computeRoomTemperature(room.data, thermostat.data, outside.data, hvacUsage.data);
      room.data = updatedRoom.room;
      hvacUsage.data = updatedRoom.usage;
    }
  }

  private computeRoomTemperature(
    room: RoomTemperatureData,
    thermostat: ThermostatSettings,
    outside: OutsideTemperatureData,
    usage: HVACUsageData
  ): { room: RoomTemperatureData; usage: HVACUsageData } {
    const { minutesPerTick, heatLossRate, heatingRatePerMinute, coolingRatePerMinute, heatingPowerKw, coolingPowerKw } =
      this.options;

    const drift = heatLossRate * (outside.temperatureC - room.temperatureC);
    let hvacDelta = 0;
    let heatingEnergy = 0;
    let coolingEnergy = 0;
    let heatingMinutes = 0;
    let coolingMinutes = 0;

    switch (thermostat.state) {
      case 'heating':
        hvacDelta = heatingRatePerMinute * minutesPerTick;
        heatingEnergy = heatingPowerKw * (minutesPerTick / 60);
        heatingMinutes = minutesPerTick;
        break;
      case 'cooling':
        hvacDelta = -coolingRatePerMinute * minutesPerTick;
        coolingEnergy = coolingPowerKw * (minutesPerTick / 60);
        coolingMinutes = minutesPerTick;
        break;
      default:
        break;
    }

    const newTemperature = room.temperatureC + drift + hvacDelta;

    const updatedUsage: HVACUsageData = {
      totalEnergyKwh: usage.totalEnergyKwh + heatingEnergy + coolingEnergy,
      heatingEnergyKwh: usage.heatingEnergyKwh + heatingEnergy,
      coolingEnergyKwh: usage.coolingEnergyKwh + coolingEnergy,
      heatingMinutes: usage.heatingMinutes + heatingMinutes,
      coolingMinutes: usage.coolingMinutes + coolingMinutes
    };

    return {
      room: { temperatureC: newTemperature },
      usage: updatedUsage
    };
  }
}

export interface OutsideTemperatureOptions {
  minutesPerTick: number;
  cycleMinutes: number;
  meanTemperatureC: number;
  amplitudeC: number;
  phaseOffsetMinutes?: number;
}

export class OutsideTemperatureSystem extends System {
  constructor(
    private readonly outsideComponent: OutsideTemperatureComponent,
    private readonly timeSystem: TimeSystem,
    private readonly timeComponent: TimeComponentType,
    private readonly options: OutsideTemperatureOptions
  ) {
    super('thermostat.outside-profile');
  }

  override update(_entityManager: EntityManager, componentManager: ComponentManager): void {
    const timeEntity = this.timeSystem.currentEntity;
    if (timeEntity === null) {
      return;
    }

    const time = componentManager.getComponent(timeEntity, this.timeComponent);
    if (!time) {
      return;
    }

    const tick = time.data.tick ?? 0;
    const { minutesPerTick, cycleMinutes, meanTemperatureC, amplitudeC, phaseOffsetMinutes = 0 } = this.options;
    const elapsedMinutes = tick * minutesPerTick + phaseOffsetMinutes;
    const radians = (2 * Math.PI * (elapsedMinutes % cycleMinutes)) / cycleMinutes;
    const temperature = meanTemperatureC + amplitudeC * Math.sin(radians);

    const outsideEntities = componentManager.getEntitiesWith(this.outsideComponent);
    for (const entity of outsideEntities) {
      const outside = componentManager.getComponent(entity, this.outsideComponent);
      if (!outside) {
        continue;
      }
      outside.data = { temperatureC: temperature };
    }
  }
}
