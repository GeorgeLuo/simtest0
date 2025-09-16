import { ComponentManager } from './components/ComponentManager.js';
import { EntityManager } from './entity/EntityManager.js';
import { SystemManager } from './systems/SystemManager.js';

// Describes the status of the player in relation to the simulation loop.
export type PlayerStatus = 'idle' | 'running' | 'paused';

export type PlayerOptions = {
  // Optional managers to reuse existing state; new instances are created when omitted.
  componentManager?: ComponentManager;
  entityManager?: EntityManager;
  systemManager?: SystemManager;
  // Desired interval between updates in milliseconds.
  stepIntervalMs?: number;
  // If provided, every update uses this delta time in seconds regardless of real time.
  fixedDeltaTimeSeconds?: number;
  // Supplies the current timestamp in milliseconds; defaults to Date.now.
  now?: () => number;
};

const DEFAULT_STEP_INTERVAL_MS = 1000 / 60;

// Coordinates lifecycle events and the update loop for all registered systems.
export class Player {
  readonly componentManager: ComponentManager;
  readonly entityManager: EntityManager;
  readonly systemManager: SystemManager;

  private readonly stepIntervalMs: number;
  private readonly fixedDeltaTimeSeconds?: number;
  private readonly getTime: () => number;

  private status: PlayerStatus = 'idle';
  private initialized = false;
  private timerHandle: ReturnType<typeof setTimeout> | null = null;
  private activeTick: Promise<void> | null = null;
  private lastTickTimestamp: number | null = null;

  constructor(options: PlayerOptions = {}) {
    this.componentManager = options.componentManager ?? new ComponentManager();
    this.entityManager =
      options.entityManager ?? new EntityManager(this.componentManager);
    // Ensure the entity manager operates on the same component manager instance.
    this.entityManager.setComponentManager(this.componentManager);

    this.systemManager = options.systemManager ?? new SystemManager();

    this.stepIntervalMs = options.stepIntervalMs ?? DEFAULT_STEP_INTERVAL_MS;
    if (this.stepIntervalMs < 0) {
      throw new Error('stepIntervalMs must be a non-negative number');
    }

    if (
      options.fixedDeltaTimeSeconds !== undefined &&
      options.fixedDeltaTimeSeconds < 0
    ) {
      throw new Error('fixedDeltaTimeSeconds must be a non-negative number');
    }
    this.fixedDeltaTimeSeconds = options.fixedDeltaTimeSeconds;

    this.getTime = options.now ?? (() => Date.now());
  }

  getStatus(): PlayerStatus {
    return this.status;
  }

  async start(): Promise<void> {
    if (this.status === 'running') {
      return;
    }

    if (!this.initialized) {
      await this.systemManager.initializeAll();
      this.initialized = true;
    }

    this.status = 'running';
    this.lastTickTimestamp = null;
    this.scheduleNextTick();
  }

  async pause(): Promise<void> {
    if (this.status !== 'running') {
      return;
    }

    this.status = 'paused';
    this.clearScheduledTick();

    if (this.activeTick) {
      await this.activeTick;
    }
  }

  async stop(): Promise<void> {
    if (this.status === 'idle' && !this.initialized) {
      return;
    }

    this.status = 'idle';
    this.clearScheduledTick();

    if (this.activeTick) {
      await this.activeTick;
    }

    if (this.initialized) {
      await this.systemManager.shutdownAll();
      this.initialized = false;
    }

    this.entityManager.destroyAll();
    this.lastTickTimestamp = null;
  }

  private scheduleNextTick(): void {
    this.clearScheduledTick();

    this.timerHandle = setTimeout(() => {
      if (this.status !== 'running') {
        return;
      }

      const tickPromise = this.performTick();
      this.activeTick = tickPromise;

      tickPromise
        .catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        })
        .finally(() => {
          if (this.activeTick === tickPromise) {
            this.activeTick = null;
          }

          if (this.status === 'running') {
            this.scheduleNextTick();
          }
        });
    }, this.stepIntervalMs);
  }

  private clearScheduledTick(): void {
    if (this.timerHandle !== null) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private async performTick(): Promise<void> {
    if (this.status !== 'running') {
      return;
    }

    const currentTimestamp = this.getTime();
    const deltaTimeSeconds = this.computeDeltaTimeSeconds(currentTimestamp);

    await this.systemManager.update(deltaTimeSeconds);

    this.lastTickTimestamp = currentTimestamp;
  }

  private computeDeltaTimeSeconds(currentTimestamp: number): number {
    if (this.fixedDeltaTimeSeconds !== undefined) {
      return this.fixedDeltaTimeSeconds;
    }

    if (this.lastTickTimestamp === null) {
      return this.stepIntervalMs / 1000;
    }

    const deltaMilliseconds = currentTimestamp - this.lastTickTimestamp;
    if (deltaMilliseconds <= 0) {
      return 0;
    }

    return deltaMilliseconds / 1000;
  }
}
