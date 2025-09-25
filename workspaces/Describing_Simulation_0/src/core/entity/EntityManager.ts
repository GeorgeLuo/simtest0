import { Entity, EntityId } from './Entity';

/**
 * Lightweight placeholder for entity storage and retrieval.
 */
export class EntityManager {
  private readonly entities = new Map<EntityId, Entity>();

  createEntity(id: EntityId): Entity {
    const entity: Entity = { id };
    this.entities.set(id, entity);
    return entity;
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  removeEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  clear(): void {
    this.entities.clear();
  }
}
