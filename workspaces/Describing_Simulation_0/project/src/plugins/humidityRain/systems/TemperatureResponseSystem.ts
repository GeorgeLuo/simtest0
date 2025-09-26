import type { ComponentManager } from 'src/core/components/ComponentManager';
import { System } from 'src/core/systems/System';
import {
  AIR_TEMPERATURE_COMPONENT,
  ATMOSPHERE_COMPONENT,
  HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
  RAIN_STATE_COMPONENT,
  type AirTemperatureComponent,
  type HumidityResponseParametersComponent,
  type RainStateComponent,
} from '../components';

/**
 * Adjusts the air temperature based on current rainfall and lingering moisture.
 */
export class TemperatureResponseSystem extends System {
  constructor(
    private readonly entityId: string,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.components.isRegistered(AIR_TEMPERATURE_COMPONENT)) {
      this.components.register(AIR_TEMPERATURE_COMPONENT);
    }
  }

  protected override update(deltaTime: number): void {
    const parameters = this.getParameters();
    const rain = this.components.getComponent(
      this.entityId,
      RAIN_STATE_COMPONENT,
    );
    const temperature = this.components.getComponent(
      this.entityId,
      AIR_TEMPERATURE_COMPONENT,
    );
    const atmosphere = this.components.getComponent(
      this.entityId,
      ATMOSPHERE_COMPONENT,
    );

    if (!parameters || !rain || !temperature || !atmosphere) {
      return;
    }

    const intensity = Math.max(0, rain.intensityMmPerHour);
    const halfSaturation = Math.max(1e-3, parameters.rainHalfSaturationIntensity);
    const normalized = intensity / (intensity + halfSaturation);
    const memoryInfluence = Math.max(0, Math.min(1, atmosphere.rainMemory));

    const influence = normalized + parameters.memoryCoolingWeight * memoryInfluence;
    const clampedInfluence = Math.max(0, Math.min(1, influence));

    const targetTemperature =
      parameters.baselineTemperatureCelsius * (1 - clampedInfluence) +
      parameters.rainCoolingTargetCelsius * clampedInfluence;

    const responseRate = Math.max(0, parameters.temperatureResponseRate);
    const delta = (targetTemperature - temperature.airTemperatureCelsius) * responseRate;

    const next: AirTemperatureComponent = {
      airTemperatureCelsius:
        temperature.airTemperatureCelsius + delta * deltaTime,
    };

    this.components.setComponent(this.entityId, AIR_TEMPERATURE_COMPONENT, next);
  }

  private getParameters(): HumidityResponseParametersComponent | undefined {
    return this.components.getComponent(
      this.entityId,
      HUMIDITY_RESPONSE_PARAMETERS_COMPONENT,
    );
  }
}
