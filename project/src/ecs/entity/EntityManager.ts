import { Entity, EntityId } from './Entity';

const resolveEntityId = (entity: Entity | EntityId): EntityId =>
  typeof entity === 'number' ? entity : entity.id;

export class EntityManager {
  private nextId: EntityId = 1;
  private readonly entities = new Map<EntityId, Entity>();

  createEntity(): Entity {
    const entity = new Entity(this.nextId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  destroyEntity(entity: Entity | EntityId): boolean {
    return this.entities.delete(resolveEntityId(entity));
  }

  hasEntity(entity: Entity | EntityId): boolean {
    return this.entities.has(resolveEntityId(entity));
  }

  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
}
