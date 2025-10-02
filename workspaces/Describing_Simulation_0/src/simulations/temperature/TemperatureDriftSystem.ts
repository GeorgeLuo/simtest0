import { System } from "../../core/systems/System";
import type { EntityManager } from "../../core/entity/EntityManager";
import type { ComponentManager } from "../../core/components/ComponentManager";
import {
  TemperatureStateComponent,
  TemperatureSettingsComponent,
  HeaterStateComponent,
  type TemperatureState,
  type TemperatureSettings,
  type HeaterState,
} from "./components";
import type { TemperatureControlConfig } from "./types";

export class TemperatureDriftSystem extends System {
  constructor(
    entities: EntityManager,
    components: ComponentManager,
    private readonly state: TemperatureStateComponent,
    private readonly settings: TemperatureSettingsComponent,
    private readonly heater: HeaterStateComponent,
    private readonly _config: TemperatureControlConfig,
  ) {
    super(entities, components);
  }

  override initialize(): void {
    // no-op: thermostat system provisions components
  }

  override update(): void {
    const entities = this.components.getEntitiesWith(this.state);

    for (const entity of entities) {
      const state = this.components.get(entity, this.state) as TemperatureState | undefined;
      const settings = this.components.get(entity, this.settings) as TemperatureSettings | undefined;
      const heater = this.components.get(entity, this.heater) as HeaterState | undefined;

      if (!state || !settings || !heater) {
        continue;
      }

      let nextValue = state.value;

      if (heater.active) {
        nextValue = state.value + settings.heatRate;
      } else if (state.value > settings.ambient) {
        nextValue = Math.max(settings.ambient, state.value - settings.coolRate);
      } else if (state.value < settings.ambient) {
        nextValue = Math.min(settings.ambient, state.value + settings.coolRate);
      } else {
        nextValue = settings.ambient;
      }

      if (nextValue !== state.value) {
        this.components.set(entity, this.state, { value: nextValue });
      }
    }
  }

  override destroy(): void {
    // no-op: thermostat cleanup handles component lifecycle
  }
}
