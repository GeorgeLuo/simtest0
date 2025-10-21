import { ComponentManager } from "./components/ComponentManager.js";
import { EntityManager } from "./entity/EntityManager.js";
import { SystemManager } from "./systems/SystemManager.js";
export declare class Player {
    protected readonly entityManager: EntityManager;
    protected readonly componentManager: ComponentManager;
    protected readonly systemManager: SystemManager;
    private running;
    private tick;
    constructor(entityManager: EntityManager, componentManager: ComponentManager, systemManager: SystemManager);
    start(): void;
    pause(): void;
    stop(): void;
    step(): void;
    getTick(): number;
    isRunning(): boolean;
    protected executeSystems(): void;
    protected onAfterStep(): void;
}
