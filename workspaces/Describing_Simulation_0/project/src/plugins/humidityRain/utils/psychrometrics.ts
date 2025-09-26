/**
 * Psychrometric helper utilities that translate between humidity measures.
 */
const DEFAULT_PRESSURE_HPA = 1013.25;

/**
 * Computes saturation vapour pressure (in hPa) for a given air temperature.
 */
export function saturationVapourPressure(tempCelsius: number): number {
  return 6.112 * Math.exp((17.67 * tempCelsius) / (tempCelsius + 243.5));
}

/**
 * Computes the actual vapour pressure (in hPa) for the supplied humidity state.
 */
export function vapourPressure(
  tempCelsius: number,
  relativeHumidity: number,
): number {
  const rh = Math.max(0, Math.min(1, relativeHumidity));
  return saturationVapourPressure(tempCelsius) * rh;
}

/**
 * Converts a vapour pressure back to a dew point temperature.
 */
export function dewPointFromVapourPressure(vapourPressureHPa: number): number {
  const clamped = Math.max(0.01, vapourPressureHPa);
  const gamma = Math.log(clamped / 6.112);
  return (243.5 * gamma) / (17.67 - gamma);
}

/**
 * Calculates the dew point temperature (°C) for the given humidity.
 */
export function dewPoint(tempCelsius: number, relativeHumidity: number): number {
  const e = vapourPressure(tempCelsius, relativeHumidity);
  return dewPointFromVapourPressure(e);
}

/**
 * Computes specific humidity (kg/kg) for the humidity state at the provided
 * pressure (defaults to 1013.25 hPa).
 */
export function specificHumidity(
  tempCelsius: number,
  relativeHumidity: number,
  pressureHPa: number = DEFAULT_PRESSURE_HPA,
): number {
  const e = vapourPressure(tempCelsius, relativeHumidity);
  const mixingRatio = 0.622 * e / Math.max(1e-3, pressureHPa - e);
  return mixingRatio / (1 + mixingRatio);
}
