/** EntityManager primitive */

class EntityManager {
  constructor(componentManager) {
    this.componentManager = componentManager;
    this.entities = new Set();
    this.nextId = 1;
  }

  createEntity() {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  removeEntity(entity) {
    if (this.entities.delete(entity) && this.componentManager) {
      this.componentManager.removeEntity(entity);
    }
  }

  hasEntity(entity) {
    return this.entities.has(entity);
  }

  allEntities() {
    return new Set(this.entities);
  }
}

module.exports = { EntityManager };
