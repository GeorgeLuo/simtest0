import type { ComponentManager } from "../../core/components/ComponentManager";
import type { EntityManager } from "../../core/entity/EntityManager";
import type { System } from "../../core/systems/System";
import type { SystemManager } from "../../core/systems/management/SystemManager";
import type { IOPlayer } from "../../core/player/IOPlayer";
import { TemperatureStateComponent, TemperatureSettingsComponent, HeaterStateComponent } from "./components";
import { ThermostatSystem } from "./ThermostatSystem";
import { TemperatureDriftSystem } from "./TemperatureDriftSystem";
import type { TemperatureControlOptions } from "./types";
import { resolveTemperatureControlOptions } from "./types";

export interface TemperatureControlFactoryContext {
  entities: EntityManager;
  components: ComponentManager;
  systems?: SystemManager;
  player: IOPlayer;
}

export function createTemperatureControlSystems(
  context: TemperatureControlFactoryContext,
  _options?: TemperatureControlOptions,
): System[] {
  const resolved = resolveTemperatureControlOptions(_options);
  const state = new TemperatureStateComponent();
  const settings = new TemperatureSettingsComponent();
  const heater = new HeaterStateComponent();

  const thermostat = new ThermostatSystem(context.entities, context.components, state, settings, heater, resolved);
  const drift = new TemperatureDriftSystem(context.entities, context.components, state, settings, heater, resolved);

  context.player.register("temperature-config", [
    {
      execute: (_player, message) => {
        const payload = message.payload as TemperatureControlOptions | undefined;
        if (!payload) {
          throw new Error("Temperature configuration payload required");
        }
        thermostat.configure(payload);
      },
    },
  ]);

  return [thermostat, drift];
}
