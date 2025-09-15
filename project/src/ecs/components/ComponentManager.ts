import { ComponentType } from './ComponentType';
import { Entity, EntityId } from '../entity/Entity';
import { EntityManager } from '../entity/EntityManager';

const resolveEntityId = (entity: Entity | EntityId): EntityId =>
  typeof entity === 'number' ? entity : entity.id;

export class ComponentManager {
  private readonly entityManager: EntityManager;
  private readonly stores = new Map<symbol, Map<EntityId, unknown>>();

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  attachComponent<T>(entity: Entity | EntityId, type: ComponentType<T>, value: T): void {
    const entityId = this.ensureEntityExists(entity);

    if (!type.validate(value)) {
      throw new Error(`Invalid value for component type \"${type.name}\"`);
    }

    const store = this.getOrCreateStore(type);
    store.set(entityId, value);
  }

  detachComponent<T>(entity: Entity | EntityId, type: ComponentType<T>): boolean {
    const store = this.getStore(type);
    if (!store) {
      return false;
    }

    const entityId = resolveEntityId(entity);
    const removed = store.delete(entityId);
    if (store.size === 0) {
      this.stores.delete(type.id);
    }

    return removed;
  }

  getComponent<T>(entity: Entity | EntityId, type: ComponentType<T>): T | undefined {
    const store = this.getStore(type);
    if (!store) {
      return undefined;
    }

    return store.get(resolveEntityId(entity)) as T | undefined;
  }

  hasComponent<T>(entity: Entity | EntityId, type: ComponentType<T>): boolean {
    const store = this.getStore(type);
    if (!store) {
      return false;
    }

    return store.has(resolveEntityId(entity));
  }

  getEntitiesWithComponent<T>(type: ComponentType<T>): EntityId[] {
    const store = this.getStore(type);
    if (!store) {
      return [];
    }

    return Array.from(store.keys());
  }

  removeAllComponents(entity: Entity | EntityId): void {
    const entityId = resolveEntityId(entity);

    const emptyTypeIds: symbol[] = [];

    for (const [typeId, store] of this.stores) {
      store.delete(entityId);
      if (store.size === 0) {
        emptyTypeIds.push(typeId);
      }
    }

    for (const typeId of emptyTypeIds) {
      this.stores.delete(typeId);
    }
  }

  private ensureEntityExists(entity: Entity | EntityId): EntityId {
    const entityId = resolveEntityId(entity);
    if (!this.entityManager.hasEntity(entityId)) {
      throw new Error(`Entity ${entityId} is not managed`);
    }

    return entityId;
  }

  private getStore<T>(type: ComponentType<T>): Map<EntityId, T> | undefined {
    return this.stores.get(type.id) as Map<EntityId, T> | undefined;
  }

  private getOrCreateStore<T>(type: ComponentType<T>): Map<EntityId, T> {
    let store = this.getStore(type);
    if (!store) {
      store = new Map<EntityId, T>();
      this.stores.set(type.id, store as Map<EntityId, unknown>);
    }

    return store;
  }
}
