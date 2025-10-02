import { System } from "../../core/systems/System";
import type { Entity } from "../../core/entity/Entity";
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
import type { TemperatureControlConfig, TemperatureControlOptions } from "./types";
import { mergeTemperatureOptions } from "./types";

export class ThermostatSystem extends System {
  #entity: Entity | null = null;
  #config: TemperatureControlConfig;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    private readonly state: TemperatureStateComponent,
    private readonly settings: TemperatureSettingsComponent,
    private readonly heater: HeaterStateComponent,
    config: TemperatureControlConfig,
  ) {
    super(entities, components);
    this.#config = config;
  }

  override initialize(): void {
    if (this.#entity !== null && this.entities.has(this.#entity)) {
      this.applyConfig(this.#entity);
      return;
    }

    const entity = this.entities.create();
    this.#entity = entity;
    this.applyConfig(entity);
  }

  override update(): void {
    if (this.#entity === null || !this.entities.has(this.#entity)) {
      this.initialize();
      return;
    }

    const entity = this.#entity;
    const state = this.components.get(entity, this.state) as TemperatureState | undefined;
    const settings = this.components.get(entity, this.settings) as TemperatureSettings | undefined;
    const heater = this.components.get(entity, this.heater) as HeaterState | undefined;

    if (!state || !settings || !heater) {
      this.applyConfig(entity);
      return;
    }

    const lowerBound = settings.target - settings.tolerance;
    const upperBound = settings.target + settings.tolerance;
    let nextActive = heater.active;

    if (state.value <= lowerBound) {
      nextActive = true;
    } else if (state.value >= upperBound) {
      nextActive = false;
    }

    if (nextActive !== heater.active) {
      this.components.set(entity, this.heater, { active: nextActive });
    }
  }

  override destroy(): void {
    if (this.#entity === null) {
      return;
    }

    const entity = this.#entity;
    this.#entity = null;
    if (this.entities.has(entity)) {
      this.entities.remove(entity);
    }
  }

  configure(options: TemperatureControlOptions): void {
    this.#config = mergeTemperatureOptions(this.#config, options);
    if (this.#entity !== null && this.entities.has(this.#entity)) {
      const entity = this.#entity;
      const currentState = this.components.get(entity, this.state) as TemperatureState | undefined;
      if (options.initial !== undefined && currentState) {
        this.components.set(entity, this.state, { value: options.initial });
      }
      this.components.set(entity, this.settings, {
        target: this.#config.target,
        tolerance: this.#config.tolerance,
        ambient: this.#config.ambient,
        heatRate: this.#config.heatRate,
        coolRate: this.#config.coolRate,
      });
    }
  }

  private applyConfig(entity: Entity): void {
    this.components.set(entity, this.state, { value: this.#config.initial });
    this.components.set(entity, this.settings, {
      target: this.#config.target,
      tolerance: this.#config.tolerance,
      ambient: this.#config.ambient,
      heatRate: this.#config.heatRate,
      coolRate: this.#config.coolRate,
    });
    const existing = this.components.get(entity, this.heater) as HeaterState | undefined;
    this.components.set(entity, this.heater, { active: existing?.active ?? false });
  }
}
