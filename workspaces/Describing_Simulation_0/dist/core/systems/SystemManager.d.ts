import { System } from "./System.js";
export interface RegisteredSystem<TSystem extends System = System> {
    readonly id: string;
    readonly instance: TSystem;
}
export declare class SystemManager {
    private readonly systems;
    private nextId;
    addSystem(system: System, indexOrOptions?: number | {
        index?: number;
        id?: string;
    }): string;
    removeSystem(id: string): void;
    getSystems(): RegisteredSystem[];
    clear(): void;
}
