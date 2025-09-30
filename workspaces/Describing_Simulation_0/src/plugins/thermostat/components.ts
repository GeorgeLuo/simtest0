import { ComponentType } from '../../core/components/ComponentType.js';

export interface RoomTemperatureData {
  temperatureC: number;
}

export class RoomTemperatureComponent extends ComponentType<RoomTemperatureData> {
  constructor() {
    super('thermostat.room-temperature');
  }

  protected override validate(data: RoomTemperatureData): void {
    if (!Number.isFinite(data.temperatureC)) {
      throw new Error('Room temperature must be a finite number');
    }
  }
}

export type ThermostatState = 'heating' | 'cooling' | 'idle';

export interface ThermostatSettings {
  targetTemperatureC: number;
  toleranceC: number;
  state: ThermostatState;
}

export class ThermostatComponent extends ComponentType<ThermostatSettings> {
  constructor() {
    super('thermostat.controller');
  }

  protected override validate(data: ThermostatSettings): void {
    if (!Number.isFinite(data.targetTemperatureC)) {
      throw new Error('Thermostat target must be finite');
    }
    if (!Number.isFinite(data.toleranceC) || data.toleranceC < 0) {
      throw new Error('Thermostat tolerance must be a non-negative finite number');
    }
    if (!['heating', 'cooling', 'idle'].includes(data.state)) {
      throw new Error('Thermostat state must be heating, cooling, or idle');
    }
  }
}

export interface OutsideTemperatureData {
  temperatureC: number;
}

export class OutsideTemperatureComponent extends ComponentType<OutsideTemperatureData> {
  constructor() {
    super('thermostat.outside-temperature');
  }

  protected override validate(data: OutsideTemperatureData): void {
    if (!Number.isFinite(data.temperatureC)) {
      throw new Error('Outside temperature must be finite');
    }
  }
}

export interface HVACUsageData {
  totalEnergyKwh: number;
  heatingEnergyKwh: number;
  coolingEnergyKwh: number;
  heatingMinutes: number;
  coolingMinutes: number;
}

export class HVACUsageComponent extends ComponentType<HVACUsageData> {
  constructor() {
    super('thermostat.hvac-usage');
  }

  protected override validate(data: HVACUsageData): void {
    for (const [key, value] of Object.entries(data)) {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`${key} must be a non-negative finite number`);
      }
    }
  }
}
