/** ComponentManager primitive */

class ComponentManager {
  constructor() {
    this.components = new Map(); // Map<entity, Map<compType, component>>
  }

  addComponent(entity, compType, component) {
    if (!this.components.has(entity)) {
      this.components.set(entity, new Map());
    }
    const entityMap = this.components.get(entity);
    entityMap.set(compType, component);
  }

  getComponent(entity, compType) {
    const entityMap = this.components.get(entity);
    return entityMap ? entityMap.get(compType) : undefined;
  }

  getComponents(entity) {
    const entityMap = this.components.get(entity);
    return entityMap ? new Map(entityMap) : new Map();
  }

  getEntitiesWithComponent(compType) {
    const result = new Set();
    for (const [entity, comps] of this.components.entries()) {
      if (comps.has(compType)) {
        result.add(entity);
      }
    }
    return result;
  }

  removeComponent(entity, compType) {
    const entityMap = this.components.get(entity);
    if (entityMap) {
      entityMap.delete(compType);
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
