import { Entity, EntityId } from "./Entity";
import { EntityManager } from "./EntityManager";
import { ConcreteEntity } from "./ConcreteEntity";

const UUID_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

const generateUuid = (): string =>
  UUID_TEMPLATE.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

/**
 * Default entity manager backed by an in-memory map of entity identifiers to
 * their corresponding entity instances.
 */
export class ConcreteEntityManager extends EntityManager {
  private readonly entities = new Map<EntityId, ConcreteEntity>();

  public createEntity(initialComponents?: Map<string, unknown>): Entity;
  public createEntity(initialComponents: Map<string, unknown> | undefined, requestedId?: EntityId): Entity;
  public createEntity(initialComponents?: Map<string, unknown>, requestedId?: EntityId): Entity {
    const entityId = requestedId ?? generateUuid();

    if (this.entities.has(entityId)) {
      throw new Error(`Entity with id "${entityId}" already exists.`);
    }

    const entity = new ConcreteEntity(entityId, initialComponents);
    this.entities.set(entityId, entity);
    return entity;
  }

  public destroyEntity(entityId: EntityId): void {
    this.entities.delete(entityId);
  }

  public getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }

  public getAllEntities(): Iterable<Entity> {
    return this.entities.values();
  }
}
