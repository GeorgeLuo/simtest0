import { ComponentManager } from "../components/ComponentManager.js";
import { Entity } from "./Entity.js";
export declare class EntityManager {
    private readonly componentManager;
    private nextEntityId;
    private readonly entities;
    constructor(componentManager: ComponentManager);
    createEntity(): Entity;
    removeEntity(entity: Entity): void;
    hasEntity(entity: Entity): boolean;
    getEntities(): Entity[];
    forEachEntity(callback: (entity: Entity) => void): void;
}
