import { Entity } from '../entity/Entity';
import { ComponentInstance, ComponentType } from './ComponentType';

/**
 * Maintains bidirectional lookups of entities and their components.
 * Enforces the rule of one component per type per entity.
 */
export class ComponentManager {
  private readonly componentsByEntity = new Map<Entity, Map<string, ComponentInstance<unknown>>>();
  private readonly entitiesByType = new Map<string, Set<Entity>>();

  /**
   * Attach a component instance to an entity. Existing component of the same
   * type should be replaced or rejected per implementation decision.
   */
  addComponent<T>(entity: Entity, type: ComponentType<T>, payload: T): void {
    if (!type.validate(payload)) {
      throw new Error(`Payload failed validation for component type ${type.id}`);
    }

    let components = this.componentsByEntity.get(entity);
    if (!components) {
      components = new Map();
      this.componentsByEntity.set(entity, components);
    }

    const instance: ComponentInstance<T> = { type, payload };
    components.set(type.id, instance);

    let entities = this.entitiesByType.get(type.id);
    if (!entities) {
      entities = new Set();
      this.entitiesByType.set(type.id, entities);
    }
    entities.add(entity);
  }

  /**
   * Remove all components for an entity, returning how many were removed.
   */
  removeAll(entity: Entity): number {
    const components = this.componentsByEntity.get(entity);
    if (!components) {
      return 0;
    }

    const removedCount = components.size;
    components.forEach((_, typeId) => {
      const entities = this.entitiesByType.get(typeId);
      entities?.delete(entity);
      if (entities && entities.size === 0) {
        this.entitiesByType.delete(typeId);
      }
    });

    this.componentsByEntity.delete(entity);
    return removedCount;
  }

  /**
   * Remove a specific component from an entity.
   */
  removeComponent<T>(entity: Entity, type: ComponentType<T>): boolean {
    const components = this.componentsByEntity.get(entity);
    if (!components?.delete(type.id)) {
      return false;
    }

    if (components.size === 0) {
      this.componentsByEntity.delete(entity);
    }

    const entities = this.entitiesByType.get(type.id);
    entities?.delete(entity);
    if (entities && entities.size === 0) {
      this.entitiesByType.delete(type.id);
    }

    return true;
  }

  /**
   * Retrieve a component instance for the entity, if present.
   */
  getComponent<T>(entity: Entity, type: ComponentType<T>): ComponentInstance<T> | undefined {
    const components = this.componentsByEntity.get(entity);
    return components?.get(type.id) as ComponentInstance<T> | undefined;
  }

  /**
   * Retrieve all components for the entity.
   */
  getComponents(entity: Entity): ComponentInstance<unknown>[] {
    const components = this.componentsByEntity.get(entity);
    return components ? Array.from(components.values()) : [];
  }

  /**
   * Populate the provided array with the component instances for the entity,
   * returning the number of components discovered. The target array is cleared
   * before population to support buffer reuse.
   */
  collectComponents(entity: Entity, target: ComponentInstance<unknown>[]): number {
    target.length = 0;
    const components = this.componentsByEntity.get(entity);
    if (!components) {
      return 0;
    }

    let index = 0;
    components.forEach((instance) => {
      target[index] = instance;
      index += 1;
    });
    target.length = index;
    return index;
  }

  /**
   * Retrieve entities that possess a component of the provided type.
   */
  getEntitiesWithComponent<T>(type: ComponentType<T>): Entity[] {
    const entities = this.entitiesByType.get(type.id);
    return entities ? Array.from(entities.values()) : [];
  }
}
