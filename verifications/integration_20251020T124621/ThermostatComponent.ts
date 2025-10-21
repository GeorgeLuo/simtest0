// ThermostatComponent defines the payload tracked on entities.
export interface ThermostatComponent {
  setPointCelsius: number;
  measuredCelsius: number;
}

export const DEFAULT_THERMOSTAT_COMPONENT: ThermostatComponent = {
  setPointCelsius: 22,
  measuredCelsius: 20,
};
