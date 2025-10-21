import { ComponentManager } from "./components/ComponentManager.js";
import { EntityManager } from "./entity/EntityManager.js";
import { SystemManager } from "./systems/SystemManager.js";

export class Player {
  private running = false;
  private tick = 0;

  constructor(
    protected readonly entityManager: EntityManager,
    protected readonly componentManager: ComponentManager,
    protected readonly systemManager: SystemManager,
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  stop(): void {
    this.running = false;
    this.systemManager.clear();
    const entities = [...this.entityManager.getEntities()];
    for (const entity of entities) {
      this.entityManager.removeEntity(entity);
    }
    this.tick = 0;
  }

  step(): void {
    if (!this.running) {
      return;
    }

    this.executeSystems();
    this.tick += 1;
    this.onAfterStep();
  }

  getTick(): number {
    return this.tick;
  }

  isRunning(): boolean {
    return this.running;
  }

  protected executeSystems(): void {
    for (const { instance } of this.systemManager.getSystems()) {
      instance.update();
    }
  }

  protected onAfterStep(): void {
    // hook for subclasses
  }
}
