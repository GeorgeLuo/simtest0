import { ComponentManager } from './components/ComponentManager';
import { EntityManager } from './entity/EntityManager';
import { SystemManager } from './systems/SystemManager';

export interface PlayerOptions {
  /** Interval between ticks in milliseconds. */
  tickIntervalMs?: number;
  /**
   * Provides the current timestamp in milliseconds. Used for calculating delta
   * time between ticks. Defaults to {@link Date.now}.
   */
  timeProvider?: () => number;
}

type PlayerState = 'idle' | 'running' | 'paused';

/**
 * Coordinates simulation execution by advancing registered systems on a fixed
 * cadence while exposing lifecycle controls to pause or tear down the
 * simulation state.
 */
export class Player {
  private readonly tickIntervalMs: number;
  private readonly timeProvider: () => number;
  private loopHandle: NodeJS.Timeout | null = null;
  private state: PlayerState = 'idle';
  private lastTickTime: number | null = null;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
    private readonly systems: SystemManager,
    options: PlayerOptions = {}
  ) {
    const interval = options.tickIntervalMs ?? 16;
    this.tickIntervalMs = interval > 0 ? interval : 1;
    this.timeProvider = options.timeProvider ?? (() => Date.now());
  }

  /** Starts the simulation loop if it has not yet begun. */
  start(): void {
    if (this.state !== 'idle') {
      return;
    }

    this.state = 'running';
    this.beginLoop();
  }

  /** Temporarily halts the simulation loop without tearing down state. */
  pause(): void {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'paused';
    this.clearLoop();
  }

  /** Resumes the simulation loop after a {@link pause}. */
  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    this.state = 'running';
    this.beginLoop();
  }

  /** Stops the simulation loop and tears down all managed state. */
  stop(): void {
    if (this.state === 'running' || this.state === 'paused') {
      this.clearLoop();
    }

    this.state = 'idle';
    this.lastTickTime = null;
    this.teardown();
  }

  private beginLoop(): void {
    this.lastTickTime = this.timeProvider();
    this.clearLoop();
    this.loopHandle = setInterval(() => this.step(), this.tickIntervalMs);
  }

  private clearLoop(): void {
    if (this.loopHandle) {
      clearInterval(this.loopHandle);
      this.loopHandle = null;
    }
  }

  private step(): void {
    if (this.state !== 'running') {
      return;
    }

    const currentTime = this.timeProvider();
    const previousTime = this.lastTickTime ?? currentTime;
    this.lastTickTime = currentTime;

    const deltaMs = Math.max(0, currentTime - previousTime);
    this.systems.tick(deltaMs / 1000);
  }

  private teardown(): void {
    this.systems.destroyAll();

    const entityIds = new Set<string>();
    for (const entity of this.entities.list()) {
      entityIds.add(entity.id);
    }

    for (const type of this.components.registeredTypes()) {
      for (const entityId of this.components.entitiesWithComponent(type)) {
        entityIds.add(entityId);
      }
    }

    for (const entityId of entityIds) {
      if (this.entities.has(entityId)) {
        this.entities.remove(entityId);
      }

      this.components.removeAllComponents(entityId);
    }
  }
}
