import { Entity } from './Entity.js';

type RemovalListener = (entity: Entity) => void;

/**
 * Tracks the lifecycle of entities within the simulation and notifies dependents
 * when entities leave the world so they can dispose of related state.
 */
export class EntityManager {
  private nextEntity: Entity = 0;
  private readonly entities = new Set<Entity>();
  private readonly removalListeners = new Set<RemovalListener>();

  createEntity(): Entity {
    const entity = this.nextEntity++;
    this.entities.add(entity);
    return entity;
  }

  removeEntity(entity: Entity): void {
    if (!this.entities.delete(entity)) {
      return;
    }

    for (const listener of this.removalListeners) {
      listener(entity);
    }
  }

  hasEntity(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  listEntities(): Entity[] {
    return Array.from(this.entities);
  }

  onEntityRemoved(listener: RemovalListener): () => void {
    this.removalListeners.add(listener);
    return () => this.removalListeners.delete(listener);
  }
}
