import { Entity } from './Entity';

/**
 * Manages lifecycle of entities within the simulation. Responsible for
 * allocating, tracking, and destroying entity identifiers.
 */
export class EntityManager {
  private nextId: number = 0;
  private readonly active = new Set<Entity>();

  /**
   * Create and register a new entity identifier.
   *
   * @returns Entity id allocated for use in the environment.
   */
  create(): Entity {
    const entity = this.nextId as Entity;
    this.nextId += 1;
    this.active.add(entity);
    return entity;
  }

  /**
   * Remove an entity and return whether it existed. This should trigger
   * component cleanup via the ComponentManager (wired externally).
   *
   * @param entity Entity identifier to destroy.
   */
  remove(entity: Entity): boolean {
    return this.active.delete(entity);
  }

  /**
   * Indicates whether the manager currently tracks the entity.
   *
   * @param entity Entity identifier to inspect.
   */
  has(entity: Entity): boolean {
    return this.active.has(entity);
  }

  /**
   * Provide a snapshot list of active entities. Higher level systems
   * may use this to iterate over the environment.
   */
  list(): Entity[] {
    return Array.from(this.active.values());
  }
}
