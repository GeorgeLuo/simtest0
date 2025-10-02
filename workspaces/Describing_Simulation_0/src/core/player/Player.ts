import type { EntityManager } from "../entity/EntityManager";
import type { ComponentManager } from "../components/ComponentManager";
import type { SystemManager } from "../systems/management/SystemManager";
import type { System } from "../systems/System";
import type { Bus } from "../messaging/Bus";

export interface LoopController {
  start(loop: () => void): void;
  stop(): void;
}

export class Player {
  #running = false;
  #inbound?: Bus<any>;
  #outbound?: Bus<any>;

  constructor(
    protected readonly entities: EntityManager,
    protected readonly components: ComponentManager,
    protected readonly systems: SystemManager,
    protected readonly loop: LoopController,
    buses?: { inbound?: Bus<any>; outbound?: Bus<any> },
  ) {
    this.#inbound = buses?.inbound;
    this.#outbound = buses?.outbound;
  }

  get entityManager(): EntityManager {
    return this.entities;
  }

  get componentManager(): ComponentManager {
    return this.components;
  }

  get systemManager(): SystemManager {
    return this.systems;
  }

  protected get inbound(): Bus<any> | undefined {
    return this.#inbound;
  }

  protected get outbound(): Bus<any> | undefined {
    return this.#outbound;
  }

  start(): void {
    if (this.#running) {
      return;
    }

    this.systems.start();
    this.loop.start(() => this.onLoopTick());
    this.#running = true;
  }

  pause(): void {
    if (!this.#running) {
      return;
    }

    this.loop.stop();
    this.#running = false;
  }

  stop(): void {
    this.loop.stop();
    this.#running = false;
    this.systems.clear();
    this.components.clearAll();
    this.entities.clear();
  }

  protected onLoopTick(): void {
    this.systems.tick();
  }

  addSystem(system: System, order?: number): void {
    this.systems.add(system, order);
  }

  removeSystem(system: System): void {
    this.systems.remove(system);
  }

  listSystems(): ReadonlyArray<System> {
    return this.systems.list();
  }
}
