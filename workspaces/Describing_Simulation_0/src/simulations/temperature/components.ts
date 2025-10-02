import { ComponentType } from "../../core/components/ComponentType";

export interface TemperatureState {
  value: number;
}

export interface TemperatureSettings {
  target: number;
  tolerance: number;
  ambient: number;
  heatRate: number;
  coolRate: number;
}

export interface HeaterState {
  active: boolean;
}

export class TemperatureStateComponent extends ComponentType<TemperatureState> {
  constructor(id = "temperature_state") {
    super(id);
  }
}

export class TemperatureSettingsComponent extends ComponentType<TemperatureSettings> {
  constructor(id = "temperature_settings") {
    super(id);
  }
}

export class HeaterStateComponent extends ComponentType<HeaterState> {
  constructor(id = "heater_state") {
    super(id);
  }
}
