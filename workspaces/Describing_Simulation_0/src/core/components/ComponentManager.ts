import type { Entity } from "../entity/Entity";
import type { ComponentType, ComponentData } from "./ComponentType";

export class ComponentManager {
  #components = new Map<Entity, Map<ComponentType<unknown>, ComponentData<unknown>>>();
  #typedIndex = new Map<ComponentType<unknown>, Set<Entity>>();

  get<T>(entity: Entity, type: ComponentType<T>): ComponentData<T> | undefined {
    return this.#components.get(entity)?.get(type) as ComponentData<T> | undefined;
  }

  getAll(entity: Entity): ReadonlyMap<ComponentType<unknown>, ComponentData<unknown>> {
    const existing = this.#components.get(entity);
    const snapshot = new Map(existing ?? []);
    return new Proxy(snapshot, {
      get(target, prop, receiver) {
        if (prop === "set" || prop === "delete" || prop === "clear") {
          return () => {
            throw new Error("Component map view is read-only");
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as unknown as ReadonlyMap<ComponentType<unknown>, ComponentData<unknown>>;
  }

  getEntitiesWith<T>(type: ComponentType<T>): ReadonlySet<Entity> {
    const snapshot = new Set(this.#typedIndex.get(type) ?? []);
    return new Proxy(snapshot, {
      get(target, prop, receiver) {
        if (prop === "add" || prop === "delete" || prop === "clear") {
          return () => {
            throw new Error("Component entity set view is read-only");
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as unknown as ReadonlySet<Entity>;
  }

  forEach(entity: Entity, visitor: (type: ComponentType<unknown>, data: ComponentData<unknown>) => void): void {
    const entityComponents = this.#components.get(entity);
    if (!entityComponents) {
      return;
    }

    for (const [type, data] of entityComponents) {
      visitor(type, data);
    }
  }

  set<T>(entity: Entity, type: ComponentType<T>, data: ComponentData<T>): void {
    let entityComponents = this.#components.get(entity);
    if (!entityComponents) {
      entityComponents = new Map();
      this.#components.set(entity, entityComponents);
    }

    entityComponents.set(type, data);

    let indexedEntities = this.#typedIndex.get(type);
    if (!indexedEntities) {
      indexedEntities = new Set();
      this.#typedIndex.set(type, indexedEntities);
    }
    indexedEntities.add(entity);
  }

  remove<T>(entity: Entity, type: ComponentType<T>): void {
    const entityComponents = this.#components.get(entity);
    if (!entityComponents) {
      return;
    }

    if (!entityComponents.delete(type)) {
      return;
    }

    const indexedEntities = this.#typedIndex.get(type);
    indexedEntities?.delete(entity);
    if (indexedEntities && indexedEntities.size === 0) {
      this.#typedIndex.delete(type);
    }

    if (entityComponents.size === 0) {
      this.#components.delete(entity);
    }
  }

  removeAll(entity: Entity): void {
    const entityComponents = this.#components.get(entity);
    if (!entityComponents) {
      return;
    }

    for (const type of entityComponents.keys()) {
      const indexedEntities = this.#typedIndex.get(type);
      indexedEntities?.delete(entity);
      if (indexedEntities && indexedEntities.size === 0) {
        this.#typedIndex.delete(type);
      }
    }

    this.#components.delete(entity);
  }

  clearAll(): void {
    this.#components.clear();
    this.#typedIndex.clear();
  }
}
