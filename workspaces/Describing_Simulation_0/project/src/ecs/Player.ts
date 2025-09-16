import type { ComponentType } from './components/ComponentType.js';
import type { Entity } from './entity/Entity.js';
import { EntityManager } from './entity/EntityManager.js';
import { ComponentManager } from './components/ComponentManager.js';
import { SystemManager } from './systems/SystemManager.js';

export type ComponentBlueprint = {
  typeId: string;
  values?: Record<string, unknown>;
};

export type EntityBlueprint = {
  id?: number;
  components?: ComponentBlueprint[];
};

export type SnapshotEntity = {
  id: number;
  components: Record<string, unknown>;
};

export type PlayerSnapshot = {
  tick: number;
  elapsedTime: number;
  entities: SnapshotEntity[];
};

export type PlayerState = 'idle' | 'running' | 'paused' | 'stopped';

export interface PlayerOptions {
  tickIntervalMs?: number;
  deltaTime?: number;
}

export class Player {
  protected readonly entityManager: EntityManager;
  protected readonly componentManager: ComponentManager;
  protected readonly systemManager: SystemManager;

  private readonly tickIntervalMs: number;
  private readonly deltaTime: number;

  private state: PlayerState = 'idle';
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;
  private elapsedTime = 0;
  private initialized = false;
  private updateInFlight: Promise<void> | null = null;

  constructor(
    entityManager: EntityManager,
    componentManager: ComponentManager,
    systemManager: SystemManager,
    options: PlayerOptions = {},
  ) {
    this.entityManager = entityManager;
    this.componentManager = componentManager;
    this.systemManager = systemManager;
    this.tickIntervalMs = options.tickIntervalMs ?? 16;
    this.deltaTime = options.deltaTime ?? 1;
  }

  get status(): PlayerState {
    return this.state;
  }

  get ticks(): number {
    return this.tickCount;
  }

  get elapsed(): number {
    return this.elapsedTime;
  }

  async start(): Promise<void> {
    if (this.state === 'running') {
      return;
    }

    if (!this.initialized) {
      await this.systemManager.initializeAll();
      this.initialized = true;
    }

    this.state = 'running';
    this.scheduleNextUpdate();
  }

  async pause(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'paused';
    this.clearScheduledUpdate();
    await this.awaitPendingUpdate();
  }

  async stop(): Promise<void> {
    if (this.state === 'idle' && !this.initialized) {
      return;
    }

    this.state = 'stopped';
    this.clearScheduledUpdate();
    await this.awaitPendingUpdate();

    if (this.initialized) {
      await this.systemManager.shutdownAll();
    }

    this.entityManager.destroyAll();
    this.tickCount = 0;
    this.elapsedTime = 0;
    this.initialized = false;
  }

  async injectEntity(blueprint: EntityBlueprint): Promise<Entity> {
    const entity = this.entityManager.create(blueprint.id);

    if (!blueprint.components) {
      return entity;
    }

    for (const componentBlueprint of blueprint.components) {
      const componentType = this.requireComponentType(componentBlueprint.typeId);
      this.componentManager.attachComponent(
        entity.id,
        componentType,
        componentBlueprint.values as Partial<unknown>,
      );
    }

    return entity;
  }

  protected async afterUpdate(): Promise<void> {
    // Subclasses can override this hook to react to completed updates.
  }

  protected captureSnapshot(): PlayerSnapshot {
    const entities = this.entityManager.getAll();

    return {
      tick: this.tickCount,
      elapsedTime: this.elapsedTime,
      entities: entities.map((entity) => this.snapshotEntity(entity)),
    };
  }

  private async runUpdate(): Promise<void> {
    if (this.state !== 'running') {
      return;
    }

    this.updateInFlight = (async () => {
      await this.systemManager.update(this.deltaTime);
      this.tickCount += 1;
      this.elapsedTime += this.deltaTime;
      await this.afterUpdate();
    })();

    try {
      await this.updateInFlight;
    } finally {
      this.updateInFlight = null;
      if (this.state === 'running') {
        this.scheduleNextUpdate();
      }
    }
  }

  private scheduleNextUpdate(): void {
    this.clearScheduledUpdate();

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runUpdate();
    }, this.tickIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  private clearScheduledUpdate(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async awaitPendingUpdate(): Promise<void> {
    if (this.updateInFlight) {
      await this.updateInFlight;
    }
  }

  private snapshotEntity(entity: Entity): SnapshotEntity {
    const associations = entity.enumerateComponents(this.componentManager);
    const components: Record<string, unknown> = {};

    for (const association of associations) {
      components[association.type.id] = this.cloneValue(association.instance);
    }

    return {
      id: entity.id,
      components,
    };
  }

  private requireComponentType(typeId: string): ComponentType<unknown> {
    const componentType = this.componentManager.getTypeById(typeId);

    if (!componentType) {
      throw new Error(`Component type "${typeId}" is not registered`);
    }

    return componentType as ComponentType<unknown>;
  }

  private cloneValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }
}
