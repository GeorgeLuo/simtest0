import { Entity } from '../entity/Entity.js';
import { EntityManager } from '../entity/EntityManager.js';
import { ComponentInstance, ComponentType } from './ComponentType.js';

/**
 * Coordinates component instances within the simulation.
 */
export class ComponentManager {
  private readonly componentsByEntity = new Map<Entity, Map<ComponentType<unknown>, ComponentInstance<unknown>>>();
  private readonly entitiesByType = new Map<ComponentType<unknown>, Set<Entity>>();

  constructor(private readonly entityManager: EntityManager) {
    this.entityManager.onEntityRemoved((entity) => this.removeAll(entity));
  }

  addComponent<TData>(entity: Entity, type: ComponentType<TData>, data: TData): ComponentInstance<TData> {
    this.assertEntityExists(entity);
    const entityComponents = this.ensureEntityComponents(entity);

    if (entityComponents.has(type)) {
      throw new Error('Component already exists for entity');
    }

    const instance = type.create(entity, data);
    entityComponents.set(type, instance);
    this.ensureTypeEntities(type).add(entity);
    return instance;
  }

  getComponent<TData>(entity: Entity, type: ComponentType<TData>): ComponentInstance<TData> | undefined {
    const entityComponents = this.componentsByEntity.get(entity);
    return entityComponents?.get(type) as ComponentInstance<TData> | undefined;
  }

  getComponents(entity: Entity): Array<ComponentInstance<unknown>> {
    const entityComponents = this.componentsByEntity.get(entity);
    if (!entityComponents) {
      return [];
    }

    return Array.from(entityComponents.values());
  }

  getEntitiesWith<TData>(type: ComponentType<TData>): Entity[] {
    const entities = this.entitiesByType.get(type);
    if (!entities) {
      return [];
    }

    return Array.from(entities);
  }

  removeComponent<TData>(entity: Entity, type: ComponentType<TData>): void {
    const entityComponents = this.componentsByEntity.get(entity);
    if (!entityComponents?.has(type)) {
      return;
    }

    entityComponents.delete(type);
    if (entityComponents.size === 0) {
      this.componentsByEntity.delete(entity);
    }

    const entitiesWithType = this.entitiesByType.get(type);
    if (entitiesWithType) {
      entitiesWithType.delete(entity);
      if (entitiesWithType.size === 0) {
        this.entitiesByType.delete(type);
      }
    }
  }

  removeAll(entity: Entity): void {
    const entityComponents = this.componentsByEntity.get(entity);
    if (!entityComponents) {
      return;
    }

    for (const type of entityComponents.keys()) {
      const entities = this.entitiesByType.get(type);
      if (!entities) {
        continue;
      }

      entities.delete(entity);
      if (entities.size === 0) {
        this.entitiesByType.delete(type);
      }
    }

    this.componentsByEntity.delete(entity);
  }

  private assertEntityExists(entity: Entity): void {
    if (!this.entityManager.hasEntity(entity)) {
      throw new Error(`Entity ${entity} does not exist`);
    }
  }

  private ensureEntityComponents(entity: Entity): Map<ComponentType<unknown>, ComponentInstance<unknown>> {
    let entityComponents = this.componentsByEntity.get(entity);
    if (!entityComponents) {
      entityComponents = new Map();
      this.componentsByEntity.set(entity, entityComponents);
    }

    return entityComponents;
  }

  private ensureTypeEntities(type: ComponentType<unknown>): Set<Entity> {
    let entities = this.entitiesByType.get(type);
    if (!entities) {
      entities = new Set();
      this.entitiesByType.set(type, entities);
    }

    return entities;
  }
}
