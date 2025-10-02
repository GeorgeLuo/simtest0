import { System } from "../System";
import type { Entity } from "../../entity/Entity";
import type { EntityManager } from "../../entity/EntityManager";
import type { ComponentManager } from "../../components/ComponentManager";
import { TimeComponent } from "../../components/time/TimeComponent";
import type { TimeState } from "../../components/time/TimeComponent";

export class TimeSystem extends System {
  #timeEntity: Entity | null = null;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    private readonly timeComponent: TimeComponent,
  ) {
    super(entities, components);
  }

  override initialize(): void {
    if (this.#timeEntity !== null) {
      return;
    }

    const entity = this.entities.create();
    this.components.set(entity, this.timeComponent, { tick: 0 });
    this.#timeEntity = entity;
  }

  override update(): void {
    if (this.#timeEntity === null) {
      throw new Error("TimeSystem must be initialized before updating");
    }

    const state = this.components.get(this.#timeEntity, this.timeComponent) as TimeState | undefined;
    if (!state) {
      throw new Error("Time component is missing for the time entity");
    }

    this.components.set(this.#timeEntity, this.timeComponent, {
      tick: state.tick + 1,
    });
  }

  override destroy(): void {
    if (this.#timeEntity === null) {
      return;
    }

    const entity = this.#timeEntity;
    this.components.removeAll(entity);
    this.entities.remove(entity);
    this.#timeEntity = null;
  }

  hydrate(entity: Entity, tick: number): void {
    this.#timeEntity = entity;
    this.components.set(entity, this.timeComponent, { tick });
  }

  get entity(): Entity {
    if (this.#timeEntity === null) {
      throw new Error("TimeSystem has not been initialized");
    }
    return this.#timeEntity;
  }

  get tick(): number {
    const entity = this.entity;
    const state = this.components.get(entity, this.timeComponent) as TimeState | undefined;
    if (!state) {
      throw new Error("Time component is missing for the time entity");
    }
    return state.tick;
  }
}
