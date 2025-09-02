/** ComponentManager primitive */

import { ComponentType } from './ComponentType.js';

export type Component = Record<string, any>;

export class ComponentManager {
  private components: Map<number, Map<string, Component>>;

  constructor() {
    this.components = new Map(); // Map<entity, Map<compType.name, component>>
  }

  addComponent(entity: number, compType: ComponentType, component: Component): void {
    if (compType.schema) {
      for (const key of Object.keys(compType.schema)) {
        if (!(key in component)) {
          throw new Error('Component schema mismatch');
        }
      }
    }
    if (!this.components.has(entity)) {
      this.components.set(entity, new Map());
    }
    const entityMap = this.components.get(entity)!;
    entityMap.set(compType.name, component);
  }

  getComponent(entity: number, compType: ComponentType): Component | undefined {
    const entityMap = this.components.get(entity);
    return entityMap ? entityMap.get(compType.name) : undefined;
  }

  getComponents(entity: number): Map<string, Component> {
    const entityMap = this.components.get(entity);
    return entityMap ? new Map(entityMap) : new Map();
  }

  getEntitiesWithComponent(compType: ComponentType): Set<number> {
    const result = new Set<number>();
    for (const [entity, comps] of this.components.entries()) {
      if (comps.has(compType.name)) {
        result.add(entity);
      }
    }
    return result;
  }

  removeComponent(entity: number, compType: ComponentType): void {
    const entityMap = this.components.get(entity);
    if (entityMap) {
      entityMap.delete(compType.name);
      if (entityMap.size === 0) {
        this.components.delete(entity);
      }
    }
  }

  removeEntity(entity: number): void {
    this.components.delete(entity);
  }
}
