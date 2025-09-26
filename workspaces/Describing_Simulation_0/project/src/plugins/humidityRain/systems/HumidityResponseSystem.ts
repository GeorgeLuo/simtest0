import type { ComponentManager } from 'src/core/components/ComponentManager';
import { System } from 'src/core/systems/System';
import {
  AIR_TEMPERATURE_COMPONENT,
  ATMOSPHERE_COMPONENT,
  HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
  RAIN_STATE_COMPONENT,
  type AtmosphereComponent,
  type HumidityResponseParametersComponent,
} from '../components';
import { dewPoint, specificHumidity } from '../utils/psychrometrics';

/**
 * Updates atmospheric humidity based on rainfall intensity and recent moisture.
 */
export class HumidityResponseSystem extends System {
  constructor(
    private readonly entityId: string,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.components.isRegistered(ATMOSPHERE_COMPONENT)) {
      this.components.register(ATMOSPHERE_COMPONENT);
    }
  }

  protected override update(deltaTime: number): void {
    const parameters = this.getParameters();
    const atmosphere = this.components.getComponent(
      this.entityId,
      ATMOSPHERE_COMPONENT,
    );
    const rain = this.components.getComponent(
      this.entityId,
      RAIN_STATE_COMPONENT,
    );
    const temperature = this.components.getComponent(
      this.entityId,
      AIR_TEMPERATURE_COMPONENT,
    );

    if (!parameters || !rain || !temperature) {
      return;
    }

    const current: AtmosphereComponent =
      atmosphere ??
      ({
        relativeHumidity: parameters.baselineHumidity,
        dewPointCelsius: dewPoint(
          temperature.airTemperatureCelsius,
          parameters.baselineHumidity,
        ),
        specificHumidity: specificHumidity(
          temperature.airTemperatureCelsius,
          parameters.baselineHumidity,
          parameters.pressureHPa,
        ),
        rainMemory: 0,
      } satisfies AtmosphereComponent);

    const intensity = Math.max(0, rain.intensityMmPerHour);
    const halfSaturation = Math.max(1e-3, parameters.rainHalfSaturationIntensity);
    const intensityFactor = intensity / (intensity + halfSaturation);

    const gainRate = Math.max(0, parameters.rainMemoryGainRate);
    const decayRate = Math.max(0, parameters.rainMemoryDecayRate);

    const memoryGain = gainRate * intensityFactor * (1 - current.rainMemory);
    const memoryLoss = decayRate * current.rainMemory;
    const nextMemory = this.clamp01(
      current.rainMemory + (memoryGain - memoryLoss) * deltaTime,
    );

    const baseRecovery =
      parameters.baseRecoveryRate *
      (parameters.baselineHumidity - current.relativeHumidity);
    const rainConvergence =
      parameters.rainConvergenceRate *
      intensityFactor *
      (parameters.rainSaturationTarget - current.relativeHumidity);
    const memoryConvergence =
      parameters.rainMemoryConvergenceRate *
      nextMemory *
      (parameters.rainSaturationTarget - current.relativeHumidity);

    const humidityDelta =
      (baseRecovery + rainConvergence + memoryConvergence) * deltaTime;

    const nextRelativeHumidity = this.clamp01(
      current.relativeHumidity + humidityDelta,
    );

    const nextDewPoint = dewPoint(
      temperature.airTemperatureCelsius,
      nextRelativeHumidity,
    );
    const nextSpecificHumidity = specificHumidity(
      temperature.airTemperatureCelsius,
      nextRelativeHumidity,
      parameters.pressureHPa,
    );

    const next: AtmosphereComponent = {
      relativeHumidity: nextRelativeHumidity,
      dewPointCelsius: nextDewPoint,
      specificHumidity: nextSpecificHumidity,
      rainMemory: nextMemory,
    };

    this.components.setComponent(this.entityId, ATMOSPHERE_COMPONENT, next);
  }

  private getParameters():
    | HumidityResponseParametersComponent
    | undefined {
    return this.components.getComponent(
      this.entityId,
      HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
    );
  }

  private clamp01(value: number): number {
    if (Number.isNaN(value)) {
      return 0;
    }
    if (value <= 0) {
      return 0;
    }
    if (value >= 1) {
      return 1;
    }
    return value;
  }
}
