import { Entity } from './Entity.js';
import type { ComponentManager } from '../components/ComponentManager.js';

// Coordinates creation, destruction, and lookup of entities.
export class EntityManager {
  private componentManager?: ComponentManager;
  private readonly entities = new Map<number, Entity>();

  constructor(componentManager?: ComponentManager) {
    this.componentManager = componentManager;
  }

  setComponentManager(componentManager: ComponentManager): void {
    this.componentManager = componentManager;
  }

  create(existingId?: number): Entity {
    const entity = new Entity(existingId);

    if (this.entities.has(entity.id)) {
      throw new Error(`Entity ${entity.id} is already managed`);
    }

    this.entities.set(entity.id, entity);
    return entity;
  }

  has(entityId: number): boolean {
    return this.entities.has(entityId);
  }

  get(entityId: number): Entity | undefined {
    return this.entities.get(entityId);
  }

  require(entityId: number): Entity {
    const entity = this.get(entityId);

    if (!entity) {
      throw new Error(`Entity ${entityId} is not managed by this EntityManager`);
    }

    return entity;
  }

  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  destroy(target: number | Entity): boolean {
    const entityId = typeof target === 'number' ? target : target.id;

    if (!this.entities.has(entityId)) {
      return false;
    }

    this.componentManager?.removeAllComponents(entityId);
    this.entities.delete(entityId);
    return true;
  }

  destroyAll(): void {
    for (const entityId of Array.from(this.entities.keys())) {
      this.destroy(entityId);
    }
  }
}
