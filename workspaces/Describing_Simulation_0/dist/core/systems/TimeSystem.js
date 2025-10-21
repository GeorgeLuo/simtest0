import { TIME_COMPONENT } from "../components/TimeComponent.js";
import { System } from "./System.js";
export class TimeSystem extends System {
    entityManager;
    componentManager;
    timeEntity = null;
    constructor(entityManager, componentManager) {
        super();
        this.entityManager = entityManager;
        this.componentManager = componentManager;
    }
    onInit() {
        if (this.timeEntity !== null) {
            return;
        }
        const entity = this.entityManager.createEntity();
        this.componentManager.addComponent(entity, TIME_COMPONENT, { tick: 0 });
        this.timeEntity = entity;
    }
    update() {
        if (this.timeEntity === null) {
            return;
        }
        const current = this.componentManager.getComponent(this.timeEntity, TIME_COMPONENT);
        const nextTick = (current?.tick ?? 0) + 1;
        this.componentManager.addComponent(this.timeEntity, TIME_COMPONENT, {
            tick: nextTick,
        });
    }
    onDestroy() {
        if (this.timeEntity === null) {
            return;
        }
        this.componentManager.removeAllComponents(this.timeEntity);
        this.entityManager.removeEntity(this.timeEntity);
        this.timeEntity = null;
    }
}
