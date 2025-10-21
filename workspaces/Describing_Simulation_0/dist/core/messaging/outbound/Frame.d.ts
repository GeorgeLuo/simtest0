import { Entity } from "../../entity/Entity.js";
export interface ComponentSnapshot {
    readonly type: string;
    readonly data: unknown;
}
export interface EntitySnapshot {
    readonly id: Entity;
    readonly components: ComponentSnapshot[];
}
export interface Frame {
    readonly tick: number;
    readonly entities: EntitySnapshot[];
}
