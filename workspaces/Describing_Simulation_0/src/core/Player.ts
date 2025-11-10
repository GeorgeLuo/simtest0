import type { System, SystemContext } from './systems/System';
import type { SystemManager } from './systems/SystemManager';

const DEFAULT_CYCLE_INTERVAL_MS = 50;

interface InjectSystemPayload {
  system: System;
}

interface EjectSystemPayload {
  system?: System;
  systemId?: string;
}

/**
 * Base simulation player responsible for executing registered systems
 * on a fixed interval. Subclasses can hook into the lifecycle to expose
 * messaging or additional orchestration concerns.
 */
export type PlayerState = 'running' | 'paused' | 'idle';

export interface PlayerStatus {
  state: PlayerState;
  tick: number;
  systemCount: number;
}

export class Player {
  protected readonly systemManager: SystemManager;
  protected readonly cycleIntervalMs: number;
  protected tick = 0;

  private isRunning = false;
  private cycleTimer: NodeJS.Timeout | null = null;
  private nextSystemId = 1;
  private readonly systemsById = new Map<string, System>();
  private readonly idsBySystem = new Map<System, string>();

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

  injectSystem(payload: InjectSystemPayload): string {
    const systemId = this.generateSystemId();
    this.systemsById.set(systemId, payload.system);
    this.idsBySystem.set(payload.system, systemId);
    this.systemManager.addSystem(payload.system);
    return systemId;
  }

  ejectSystem(payload: EjectSystemPayload): boolean {
    const system =
      payload.system ??
      (payload.systemId ? this.systemsById.get(payload.systemId) ?? null : null);
    if (!system) {
      return false;
    }

    const removed = this.systemManager.removeSystem(system);
    if (!removed) {
      return false;
    }

    const resolvedId = payload.systemId ?? this.idsBySystem.get(system);
    if (resolvedId) {
      this.systemsById.delete(resolvedId);
    }
    this.idsBySystem.delete(system);
    return true;
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
    if (typeof (this.cycleTimer as NodeJS.Timeout).unref === 'function') {
      (this.cycleTimer as NodeJS.Timeout).unref();
    }
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
    // Systems persist across stops; clear registries for any that were removed elsewhere.
    this.cleanupSystemRegistry();
  }

  private generateSystemId(): string {
    const id = `system-${this.nextSystemId}`;
    this.nextSystemId += 1;
    return id;
  }

  private cleanupSystemRegistry(): void {
    for (const [id, system] of this.systemsById.entries()) {
      if (!this.idsBySystem.has(system)) {
        this.systemsById.delete(id);
      }
    }
    for (const [system, id] of this.idsBySystem.entries()) {
      if (!this.systemsById.has(id)) {
        this.idsBySystem.delete(system);
      }
    }
  }

  describe(): PlayerStatus {
    const state: PlayerState = this.isRunning ? 'running' : this.tick > 0 ? 'paused' : 'idle';
    return {
      state,
      tick: this.tick,
      systemCount: this.systemsById.size,
    };
  }
}
