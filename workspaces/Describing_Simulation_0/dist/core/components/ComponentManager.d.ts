import { Entity } from "../entity/Entity.js";
import { ComponentType } from "./ComponentType.js";
export interface ComponentInstance<TPayload> {
    readonly type: ComponentType<TPayload>;
    readonly data: TPayload;
}
export declare class ComponentManager {
    private readonly componentsByEntity;
    private readonly entitiesByComponentType;
    addComponent<TPayload>(entity: Entity, type: ComponentType<TPayload>, data: TPayload): void;
    removeComponent<TPayload>(entity: Entity, type: ComponentType<TPayload>): void;
    removeAllComponents(entity: Entity): void;
    getComponent<TPayload>(entity: Entity, type: ComponentType<TPayload>): TPayload | undefined;
    getComponents(entity: Entity): Array<ComponentInstance<unknown>>;
    forEachComponent(entity: Entity, iteratee: (component: ComponentInstance<unknown>) => void): void;
    getEntitiesWithComponent<TPayload>(type: ComponentType<TPayload>): Entity[];
}
