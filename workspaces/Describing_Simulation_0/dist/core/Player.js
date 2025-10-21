export class Player {
    entityManager;
    componentManager;
    systemManager;
    running = false;
    tick = 0;
    constructor(entityManager, componentManager, systemManager) {
        this.entityManager = entityManager;
        this.componentManager = componentManager;
        this.systemManager = systemManager;
    }
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
    }
    pause() {
        this.running = false;
    }
    stop() {
        this.running = false;
        this.systemManager.clear();
        const entities = [...this.entityManager.getEntities()];
        for (const entity of entities) {
            this.entityManager.removeEntity(entity);
        }
        this.tick = 0;
    }
    step() {
        if (!this.running) {
            return;
        }
        this.executeSystems();
        this.tick += 1;
        this.onAfterStep();
    }
    getTick() {
        return this.tick;
    }
    isRunning() {
        return this.running;
    }
    executeSystems() {
        for (const { instance } of this.systemManager.getSystems()) {
            instance.update();
        }
    }
    onAfterStep() {
        // hook for subclasses
    }
}
