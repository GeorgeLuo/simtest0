import { Player, type PlayerOptions } from './Player';
import type { ComponentManager } from './components/ComponentManager';
import type { EntityManager } from './entity/EntityManager';
import type { SystemManager } from './systems/SystemManager';
import type { Bus } from './messaging/Bus';
import { createFrame, type Frame } from './messaging/outbound/Frame';
import type { FrameFilter } from './messaging/outbound/FrameFilter';
import type { InboundHandlerRegistry } from './messaging/inbound/InboundHandlerRegistry';

export interface SnapshotEntity {
  readonly id: string;
  readonly components: Record<string, unknown>;
}

export interface SnapshotPayload {
  readonly entities: SnapshotEntity[];
}

export interface SnapshotMetadata extends Record<string, unknown> {
  readonly tick: number;
  readonly timestamp: number;
  readonly deltaSeconds: number;
}

export type SnapshotFrame = Frame<SnapshotPayload, SnapshotMetadata>;

export interface IOPlayerOptions extends PlayerOptions {
  /** Predicate used to determine whether a generated frame should be published. */
  readonly frameFilter?: FrameFilter<SnapshotFrame>;
  /** Message type used when publishing frames. */
  readonly frameType?: string;
}

/**
 * Extends {@link Player} with IO primitives for inbound commands and outbound state snapshots.
 */
export class IOPlayer extends Player {
  private readonly frameFilter?: FrameFilter<SnapshotFrame>;
  private readonly frameType: string;
  private inboundUnsubscribe: (() => void) | null = null;
  private tickCount = 0;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    private readonly inboundBus: Bus,
    private readonly outboundBus: Bus,
    private readonly inboundRegistry: InboundHandlerRegistry,
    options: IOPlayerOptions = {},
  ) {
    super(entities, components, systems, options);

    this.frameFilter = options.frameFilter;
    this.frameType = options.frameType ?? 'simulation/frame';

    this.subscribeToInbound();
  }

  override start(): void {
    this.subscribeToInbound();
    super.start();
  }

  override stop(): void {
    super.stop();
    this.tickCount = 0;
    this.unsubscribeFromInbound();
  }

  protected override onTick(deltaSeconds: number, timestamp: number): void {
    this.tickCount += 1;
    const frame = this.createSnapshotFrame(deltaSeconds, timestamp);

    if (!this.frameFilter || this.frameFilter(frame)) {
      this.outboundBus.send(frame);
    }
  }

  private subscribeToInbound(): void {
    if (this.inboundUnsubscribe) {
      return;
    }

    this.inboundUnsubscribe = this.inboundBus.subscribe((frame, bus) =>
      this.inboundRegistry.dispatch(frame, bus),
    );
  }

  private unsubscribeFromInbound(): void {
    if (!this.inboundUnsubscribe) {
      return;
    }

    this.inboundUnsubscribe();
    this.inboundUnsubscribe = null;
  }

  private createSnapshotFrame(
    deltaSeconds: number,
    timestamp: number,
  ): SnapshotFrame {
    const entities = this.entities
      .list()
      .map((entity) => ({
        id: entity.id,
        components: this.serializeComponents(entity.id),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return createFrame<SnapshotPayload, SnapshotMetadata>(
      this.frameType,
      { entities },
      {
        tick: this.tickCount,
        timestamp,
        deltaSeconds,
      },
    );
  }

  private serializeComponents(entityId: string): Record<string, unknown> {
    const components = this.components.getComponentsForEntity(entityId);
    const typeNames = this.components.getComponentTypeNamesForEntity(entityId);

    if (typeNames.length === 0) {
      return {};
    }

    const componentsByName = new Map<string, unknown>();
    for (const [type, component] of components.entries()) {
      componentsByName.set(type.name, component);
    }

    const snapshot: Record<string, unknown> = {};
    for (const typeName of typeNames) {
      if (!componentsByName.has(typeName)) {
        continue;
      }
      snapshot[typeName] = componentsByName.get(typeName);
    }

    return snapshot;
  }
}
