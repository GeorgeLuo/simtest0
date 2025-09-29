import { ComponentManager } from '../components/ComponentManager';
import { EntityManager } from '../entity/EntityManager';
import { System } from '../systems/System';
import { SystemManager } from '../systems/SystemManager';
import { Frame, FrameFilter } from '../messaging/Frame';
import { Bus } from '../messaging/Bus';
import { TimeComponentType, TimeSystem } from '../time';

export type PlayerState = 'idle' | 'running' | 'paused';

export interface PlayerOptions {
  tickIntervalMs?: number;
  outboundBus?: Bus<Frame>;
  frameFilter?: FrameFilter;
}

/**
 * Simulation orchestrator that coordinates managers, lifecycle state, and outbound messaging.
 */
export class Player {
  readonly entityManager: EntityManager;
  readonly componentManager: ComponentManager;
  readonly systemManager: SystemManager;
  readonly timeComponent: TimeComponentType;
  readonly timeSystem: TimeSystem;
  readonly outboundBus: Bus<Frame>;

  private state: PlayerState = 'idle';
  private loopHandle: ReturnType<typeof setInterval> | null = null;
  private readonly tickIntervalMs: number;
  private readonly frameFilter: FrameFilter;

  constructor(options: PlayerOptions = {}) {
    const { tickIntervalMs = 16, outboundBus = new Bus<Frame>(), frameFilter = new FrameFilter() } = options;

    this.tickIntervalMs = tickIntervalMs < 1 ? 1 : tickIntervalMs;
    this.outboundBus = outboundBus;
    this.frameFilter = frameFilter;

    this.entityManager = new EntityManager();
    this.componentManager = new ComponentManager(this.entityManager);
    this.systemManager = new SystemManager(this.entityManager, this.componentManager);

    this.timeComponent = new TimeComponentType();
    this.timeSystem = new TimeSystem(this.timeComponent);
    this.systemManager.addSystem(this.timeSystem, 0);
  }

  get currentState(): PlayerState {
    return this.state;
  }

  start(): void {
    if (this.state === 'running') {
      return;
    }

    this.ensureTimeSystem();
    this.state = 'running';

    this.runTick();
    this.scheduleLoop();
  }

  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'paused';
    this.clearLoop();
  }

  stop(): void {
    if (this.state === 'idle') {
      return;
    }

    this.state = 'idle';
    this.clearLoop();

    const registeredSystems = this.systemManager.listSystems();
    for (const system of registeredSystems) {
      this.systemManager.removeSystem(system.id);
    }

    const entities = this.entityManager.listEntities();
    for (const entity of entities) {
      this.entityManager.removeEntity(entity);
    }

    this.systemManager.addSystem(this.timeSystem, 0);
    this.emitFrame();
  }

  injectSystem(system: System, index?: number): void {
    this.systemManager.addSystem(system, index);
  }

  private ensureTimeSystem(): void {
    if (!this.systemManager.hasSystem(this.timeSystem.id)) {
      this.systemManager.addSystem(this.timeSystem, 0);
    }
  }

  private scheduleLoop(): void {
    this.clearLoop();
    this.loopHandle = setInterval(() => {
      if (this.state !== 'running') {
        return;
      }
      this.runTick();
    }, this.tickIntervalMs);
  }

  protected runTick(): void {
    this.systemManager.tick();
    this.emitFrame();
  }

  protected emitFrame(): void {
    const frame: Frame = {
      tick: this.resolveTick(),
      entities: {}
    };

    for (const entity of this.entityManager.listEntities()) {
      const components = this.componentManager.getComponents(entity);
      const snapshot: Record<string, unknown> = {};
      for (const component of components) {
        snapshot[component.type.id] = component.data;
      }
      frame.entities[entity] = snapshot;
    }

    const filteredFrame = this.frameFilter.filter(frame);
    this.outboundBus.publish(filteredFrame);
  }

  private resolveTick(): number {
    const timeEntity = this.timeSystem.currentEntity;
    if (timeEntity === null) {
      return 0;
    }

    const timeComponent = this.componentManager.getComponent(timeEntity, this.timeComponent);
    return timeComponent?.data.tick ?? 0;
  }

  private clearLoop(): void {
    if (this.loopHandle !== null) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }
  }
}
