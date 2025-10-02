import type { ComponentManager } from "../components/ComponentManager";
import type { Entity } from "./Entity";

export class EntityManager {
  #nextId: Entity = 0;
  #entities = new Set<Entity>();
  readonly #components: ComponentManager;

  constructor(components: ComponentManager) {
    this.#components = components;
  }

  create(): Entity {
    const entity = this.#nextId;
    this.#nextId += 1;
    this.#entities.add(entity);
    return entity;
  }

  remove(entity: Entity): void {
    if (!this.#entities.delete(entity)) {
      return;
    }
    this.#components.removeAll(entity);
  }

  has(entity: Entity): boolean {
    return this.#entities.has(entity);
  }

  list(): ReadonlySet<Entity> {
    const snapshot = new Set(this.#entities);
    return new Proxy(snapshot, {
      get(target, prop, receiver) {
        if (prop === "add" || prop === "delete" || prop === "clear") {
          return () => {
            throw new Error("Entity set view is read-only");
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as unknown as ReadonlySet<Entity>;
  }

  forEach(visitor: (entity: Entity) => void): void {
    for (const entity of this.#entities) {
      visitor(entity);
    }
  }

  clear(): void {
    for (const entity of this.#entities) {
      this.#components.removeAll(entity);
    }
    this.#entities.clear();
    this.#nextId = 0;
  }
}
