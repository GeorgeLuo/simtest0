import { ComponentType } from 'src/core/components/ComponentType';

/**
 * Tracks atmospheric moisture state for the humidity during rainfall simulation.
 */
export interface AtmosphereComponent {
  /** Relative humidity as a fraction between 0 and 1. */
  relativeHumidity: number;
  /** Dew point temperature in degrees Celsius. */
  dewPointCelsius: number;
  /** Specific humidity (kg of water vapour per kg of air). */
  specificHumidity: number;
  /**
   * Memory of recent rainfall represented as a value between 0 and 1. The
   * memory term decays slowly once rain stops, capturing lingering moisture.
   */
  rainMemory: number;
}

export const ATMOSPHERE_COMPONENT = new ComponentType<AtmosphereComponent>(
  'atmosphere.state',
);

/**
 * Holds the prognostic temperature value for the air mass under observation.
 */
export interface AirTemperatureComponent {
  /** Ambient air temperature in degrees Celsius. */
  airTemperatureCelsius: number;
}

export const AIR_TEMPERATURE_COMPONENT =
  new ComponentType<AirTemperatureComponent>('atmosphere.temperature');

/**
 * Represents the instantaneous rainfall rate impacting the air mass.
 */
export interface RainStateComponent {
  /** Rainfall intensity in millimetres per hour. */
  intensityMmPerHour: number;
}

export const RAIN_STATE_COMPONENT = new ComponentType<RainStateComponent>(
  'rain.state',
);

/**
 * Parameter set describing how humidity and temperature respond to rainfall.
 */
export interface HumidityResponseParametersComponent {
  /** Background relative humidity level that conditions return to without rain. */
  baselineHumidity: number;
  /** Target relative humidity approached during sustained rainfall. */
  rainSaturationTarget: number;
  /** Baseline temperature when no rain is present. */
  baselineTemperatureCelsius: number;
  /** Temperature approached under steady moderate rainfall. */
  rainCoolingTargetCelsius: number;
  /** Atmospheric pressure used for psychrometric calculations in hPa. */
  pressureHPa: number;
  /** Rate (per second) that humidity drifts back to the baseline level. */
  baseRecoveryRate: number;
  /**
   * Rate (per second) at which rainfall drives humidity toward the saturation
   * target when the rain rate is at the half-saturation intensity.
   */
  rainConvergenceRate: number;
  /** Rainfall intensity (mm/hr) that yields half of the rain convergence rate. */
  rainHalfSaturationIntensity: number;
  /** Gain rate (per second) for the rainfall memory accumulator. */
  rainMemoryGainRate: number;
  /** Decay rate (per second) for the rainfall memory accumulator. */
  rainMemoryDecayRate: number;
  /** Rate (per second) that temperature relaxes toward its instantaneous target. */
  temperatureResponseRate: number;
  /**
   * Weighting applied to the rain memory term when determining the temperature
   * target. Values near zero ignore the memory term while larger values give it
   * more influence.
   */
  memoryCoolingWeight: number;
  /** Additional humidity convergence contributed by rain memory (per second). */
  rainMemoryConvergenceRate: number;
}

export const HUMIDITY_RESPONSE_PARAMETERS_COMPONENT =
  new ComponentType<HumidityResponseParametersComponent>(
    'atmosphere.humidity-response-parameters',
  );
