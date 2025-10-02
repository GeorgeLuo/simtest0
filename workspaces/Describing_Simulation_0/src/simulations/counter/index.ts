import type { ComponentManager } from "../../core/components/ComponentManager";
import type { EntityManager } from "../../core/entity/EntityManager";
import type { System } from "../../core/systems/System";
import type { IOPlayer } from "../../core/player/IOPlayer";
import { CounterStateComponent } from "./components";
import { CounterIncrementSystem } from "./CounterIncrementSystem";

export interface CounterFactoryContext {
  entities: EntityManager;
  components: ComponentManager;
  player: IOPlayer;
}

export interface CounterFactoryOptions {
  initial?: number;
  componentId?: string;
}

export function createCounterSystems(
  context: CounterFactoryContext,
  options?: CounterFactoryOptions,
): System[] {
  const counterComponent = new CounterStateComponent(options?.componentId);
  const system = new CounterIncrementSystem(
    context.entities,
    context.components,
    counterComponent,
    options?.initial ?? 0,
  );

  return [system];
}
