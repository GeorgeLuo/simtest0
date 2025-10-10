import type { System, SystemContext } from './systems/System';
import type { SystemManager } from './systems/SystemManager';

const DEFAULT_CYCLE_INTERVAL_MS = 50;

interface InjectSystemPayload {
  system: System;
}

/**
 * Base simulation player responsible for executing registered systems
 * on a fixed interval. Subclasses can hook into the lifecycle to expose
 * messaging or additional orchestration concerns.
 */
export class Player {
  protected readonly systemManager: SystemManager;
  protected readonly cycleIntervalMs: number;
  protected tick = 0;

  private isRunning = false;
  private cycleTimer: NodeJS.Timeout | null = null;

  constructor(systemManager: SystemManager, cycleIntervalMs: number = DEFAULT_CYCLE_INTERVAL_MS) {
    this.systemManager = systemManager;
    this.cycleIntervalMs = cycleIntervalMs;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.ensureTimer();
    this.executeCycle();
  }

  pause(): void {
    this.isRunning = false;
  }

  stop(): void {
    this.isRunning = false;
    this.clearTimer();
    this.resetEnvironment();
  }

  injectSystem(payload: InjectSystemPayload): void {
    this.systemManager.addSystem(payload.system);
  }

  ejectSystem(payload: InjectSystemPayload): void {
    this.systemManager.removeSystem(payload.system);
  }

  protected getContext(): SystemContext {
    return this.systemManager.getContext();
  }

  protected executeCycle(): void {
    const currentTick = this.tick;
    this.onBeforeCycle(currentTick);
    this.systemManager.runCycle();
    this.onAfterCycle(currentTick, this.getContext());
    this.tick += 1;
  }

  // Intended extension hook for subclasses to prepare state prior to a cycle.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onBeforeCycle(_tick: number): void {
    /* optional override */
  }

  // Intended extension hook for subclasses to inspect the environment after a cycle.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onAfterCycle(_tick: number, _context: SystemContext): void {
    /* optional override */
  }

  private ensureTimer(): void {
    if (this.cycleTimer) {
      return;
    }

    this.cycleTimer = setInterval(() => {
      if (!this.isRunning) {
        this.clearTimer();
        return;
      }

      this.executeCycle();
    }, this.cycleIntervalMs);
  }

  private clearTimer(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  private resetEnvironment(): void {
    const context = this.getContext();
    const entities = context.entityManager.list();

    for (const entity of entities) {
      context.componentManager.removeAll(entity);
      context.entityManager.remove(entity);
    }

    this.tick = 0;
  }
}
