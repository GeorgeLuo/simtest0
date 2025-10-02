import { System } from "../../core/systems/System";
import type { Entity } from "../../core/entity/Entity";
import type { EntityManager } from "../../core/entity/EntityManager";
import type { ComponentManager } from "../../core/components/ComponentManager";
import { CounterStateComponent, type CounterState } from "./components";

export class CounterIncrementSystem extends System {
  #entity: Entity | null = null;
  #initial: number;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    private readonly counter: CounterStateComponent,
    initialValue = 0,
  ) {
    super(entities, components);
    this.#initial = initialValue;
  }

  override initialize(): void {
    this.ensureEntity();
  }

  override update(): void {
    const entity = this.ensureEntity();
    const current = this.components.get(entity, this.counter) as CounterState | undefined;
    if (!current) {
      this.components.set(entity, this.counter, { value: this.#initial });
      return;
    }

    this.components.set(entity, this.counter, { value: current.value + 1 });
  }

  override destroy(): void {
    if (this.#entity !== null && this.entities.has(this.#entity)) {
      this.entities.remove(this.#entity);
    }
    this.#entity = null;
  }

  private ensureEntity(): Entity {
    if (this.#entity !== null && this.entities.has(this.#entity)) {
      return this.#entity;
    }

    const entity = this.entities.create();
    this.#entity = entity;
    this.components.set(entity, this.counter, { value: this.#initial });
    return entity;
  }
}
