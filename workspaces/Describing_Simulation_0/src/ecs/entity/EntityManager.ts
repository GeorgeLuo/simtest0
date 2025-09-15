import { Entity, EntityId } from "./Entity";

/**
 * Coordinates the lifecycle of entities in the simulation. Implementations
 * are responsible for creating, retrieving, and destroying entity instances.
 */
export abstract class EntityManager {
  public abstract createEntity(initialComponents?: Map<string, unknown>): Entity;

  public abstract destroyEntity(entityId: EntityId): void;

  public abstract getEntity(entityId: EntityId): Entity | undefined;

  public abstract getAllEntities(): Iterable<Entity>;
}
