import type { EntityManager } from "../entity/EntityManager";
import type { ComponentManager } from "../components/ComponentManager";

export abstract class System {
  protected readonly entities: EntityManager;
  protected readonly components: ComponentManager;

  constructor(entities: EntityManager, components: ComponentManager) {
    this.entities = entities;
    this.components = components;
  }

  initialize(): void {
    // optional hook
  }

  abstract update(): void;

  destroy(): void {
    // optional hook
  }
}
