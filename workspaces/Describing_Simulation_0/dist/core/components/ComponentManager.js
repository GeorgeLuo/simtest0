export class ComponentManager {
    componentsByEntity = new Map();
    entitiesByComponentType = new Map();
    addComponent(entity, type, data) {
        const componentsForEntity = this.componentsByEntity.get(entity) ?? new Map();
        componentsForEntity.set(type, { type, data });
        this.componentsByEntity.set(entity, componentsForEntity);
        const entitiesWithType = this.entitiesByComponentType.get(type) ?? new Set();
        entitiesWithType.add(entity);
        this.entitiesByComponentType.set(type, entitiesWithType);
    }
    removeComponent(entity, type) {
        const componentsForEntity = this.componentsByEntity.get(entity);
        if (!componentsForEntity) {
            return;
        }
        const removed = componentsForEntity.delete(type);
        if (!removed) {
            return;
        }
        if (componentsForEntity.size === 0) {
            this.componentsByEntity.delete(entity);
        }
        else {
            this.componentsByEntity.set(entity, componentsForEntity);
        }
        const entitiesWithType = this.entitiesByComponentType.get(type);
        if (!entitiesWithType) {
            return;
        }
        entitiesWithType.delete(entity);
        if (entitiesWithType.size === 0) {
            this.entitiesByComponentType.delete(type);
        }
        else {
            this.entitiesByComponentType.set(type, entitiesWithType);
        }
    }
    removeAllComponents(entity) {
        const componentsForEntity = this.componentsByEntity.get(entity);
        if (!componentsForEntity) {
            return;
        }
        for (const component of componentsForEntity.values()) {
            const entitiesWithType = this.entitiesByComponentType.get(component.type);
            if (!entitiesWithType) {
                continue;
            }
            entitiesWithType.delete(entity);
            if (entitiesWithType.size === 0) {
                this.entitiesByComponentType.delete(component.type);
            }
        }
        this.componentsByEntity.delete(entity);
    }
    getComponent(entity, type) {
        const componentsForEntity = this.componentsByEntity.get(entity);
        if (!componentsForEntity) {
            return undefined;
        }
        const instance = componentsForEntity.get(type);
        return instance?.data;
    }
    getComponents(entity) {
        const componentsForEntity = this.componentsByEntity.get(entity);
        if (!componentsForEntity) {
            return [];
        }
        return Array.from(componentsForEntity.values());
    }
    forEachComponent(entity, iteratee) {
        const componentsForEntity = this.componentsByEntity.get(entity);
        if (!componentsForEntity) {
            return;
        }
        for (const component of componentsForEntity.values()) {
            iteratee(component);
        }
    }
    getEntitiesWithComponent(type) {
        const entitiesWithType = this.entitiesByComponentType.get(type);
        if (!entitiesWithType) {
            return [];
        }
        return Array.from(entitiesWithType);
    }
}
