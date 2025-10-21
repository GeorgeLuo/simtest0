import { ComponentManager } from "../components/ComponentManager.js";
import { EntityManager } from "../entity/EntityManager.js";
import { System } from "./System.js";
export declare class TimeSystem extends System {
    private readonly entityManager;
    private readonly componentManager;
    private timeEntity;
    constructor(entityManager: EntityManager, componentManager: ComponentManager);
    onInit(): void;
    update(): void;
    onDestroy(): void;
}
