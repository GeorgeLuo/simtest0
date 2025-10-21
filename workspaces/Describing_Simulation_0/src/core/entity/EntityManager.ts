import { ComponentManager } from "../components/ComponentManager.js";
import { Entity } from "./Entity.js";

export class EntityManager {
  private nextEntityId: Entity = 1;
  private readonly entities = new Set<Entity>();

  constructor(private readonly componentManager: ComponentManager) {}

  createEntity(): Entity {
    const entity = this.nextEntityId++;
    this.entities.add(entity);
    return entity;
  }

  removeEntity(entity: Entity): void {
    this.componentManager.removeAllComponents(entity);

    if (!this.entities.has(entity)) {
      return;
    }

    this.entities.delete(entity);
  }

  hasEntity(entity: Entity): boolean {
    return this.entities.has(entity);
  }

  getEntities(): Entity[] {
    return Array.from(this.entities);
  }

  forEachEntity(callback: (entity: Entity) => void): void {
    for (const entity of this.entities) {
      callback(entity);
    }
  }
}
