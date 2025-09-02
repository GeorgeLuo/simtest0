/** ComponentManager primitive */

class ComponentManager {
  constructor() {
    this.components = new Map(); // Map<entity, Map<compType.name, component>>
  }

  addComponent(entity, compType, component) {
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
    const entityMap = this.components.get(entity);
    entityMap.set(compType.name, component);
  }

  getComponent(entity, compType) {
    const entityMap = this.components.get(entity);
    return entityMap ? entityMap.get(compType.name) : undefined;
  }

  getComponents(entity) {
    const entityMap = this.components.get(entity);
    return entityMap ? new Map(entityMap) : new Map();
  }

  getEntitiesWithComponent(compType) {
    const result = new Set();
    for (const [entity, comps] of this.components.entries()) {
      if (comps.has(compType.name)) {
        result.add(entity);
      }
    }
    return result;
  }

  removeComponent(entity, compType) {
    const entityMap = this.components.get(entity);
    if (entityMap) {
      entityMap.delete(compType.name);
      if (entityMap.size === 0) {
        this.components.delete(entity);
      }
    }
  }

  removeEntity(entity) {
    this.components.delete(entity);
  }
}

module.exports = { ComponentManager };
