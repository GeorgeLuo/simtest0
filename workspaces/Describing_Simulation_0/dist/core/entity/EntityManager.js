export class EntityManager {
    componentManager;
    nextEntityId = 1;
    entities = new Set();
    constructor(componentManager) {
        this.componentManager = componentManager;
    }
    createEntity() {
        const entity = this.nextEntityId++;
        this.entities.add(entity);
        return entity;
    }
    removeEntity(entity) {
        this.componentManager.removeAllComponents(entity);
        if (!this.entities.has(entity)) {
            return;
        }
        this.entities.delete(entity);
    }
    hasEntity(entity) {
        return this.entities.has(entity);
    }
    getEntities() {
        return Array.from(this.entities);
    }
    forEachEntity(callback) {
        for (const entity of this.entities) {
            callback(entity);
        }
    }
}
