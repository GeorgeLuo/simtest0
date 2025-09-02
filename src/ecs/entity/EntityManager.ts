/** EntityManager primitive */

import { ComponentManager } from '../components/ComponentManager.js';
import { Entity } from './Entity.js';

export class EntityManager {
  private componentManager?: ComponentManager;
  private entities: Set<Entity>;
  private nextId: number;

  constructor(componentManager?: ComponentManager) {
    this.componentManager = componentManager;
    this.entities = new Set();
    this.nextId = 1;
  }

  createEntity(): Entity {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  removeEntity(entity: Entity): void {
    if (this.entities.delete(entity) && this.componentManager) {
      this.componentManager.removeEntity(entity);
    }
  }

  hasEntity(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  allEntities(): Set<Entity> {
    return new Set(this.entities);
  }
}
