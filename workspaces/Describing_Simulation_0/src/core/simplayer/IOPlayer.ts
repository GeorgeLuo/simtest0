import type { System, SystemContext } from '../systems/System';
import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import type { Acknowledgement } from '../messaging/outbound/Acknowledgement';
import type { Frame } from '../messaging/outbound/Frame';
import type { FrameFilter } from '../messaging/outbound/FrameFilter';
import type { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import type { Entity } from '../entity/Entity';
import type { ComponentInstance } from '../components/ComponentType';

interface InboundMessage {
  type?: string;
  payload?: unknown;
}

const DEFAULT_CYCLE_INTERVAL_MS = 50;

export class IOPlayer {
  private readonly systemManager: SystemManager;
  private readonly inbound: Bus<unknown>;
  private readonly outbound: Bus<Frame | Acknowledgement>;
  private readonly frameFilter: FrameFilter;
  private readonly handlers: InboundHandlerRegistry<IOPlayer>;
  private readonly unsubscribeInbound: () => void;
  private readonly cycleIntervalMs: number;

  private isRunning = false;
  private cycleTimer: NodeJS.Timeout | null = null;
  private tick = 0;

  constructor(
    systemManager: SystemManager,
    inbound: Bus<unknown>,
    outbound: Bus<Frame | Acknowledgement>,
    frameFilter: FrameFilter,
    handlers: InboundHandlerRegistry<IOPlayer>,
    cycleIntervalMs: number = DEFAULT_CYCLE_INTERVAL_MS,
  ) {
    this.systemManager = systemManager;
    this.inbound = inbound;
    this.outbound = outbound;
    this.frameFilter = frameFilter;
    this.handlers = handlers;
    this.cycleIntervalMs = cycleIntervalMs;

    this.unsubscribeInbound = this.inbound.subscribe((message) => this.handleInbound(message));
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.ensureTimer();
    this.runAndPublish();
  }

  pause(): void {
    this.isRunning = false;
  }

  stop(): void {
    this.isRunning = false;
    this.clearTimer();
  }

  injectSystem(payload: { system: System }): void {
    this.systemManager.addSystem(payload.system);
  }

  ejectSystem(payload: { system: System }): void {
    this.systemManager.removeSystem(payload.system);
  }

  protected handleInbound(message: unknown): void {
    const inboundMessage = message as InboundMessage;
    if (!inboundMessage || typeof inboundMessage.type !== 'string') {
      return;
    }

    this.handlers.handle(inboundMessage.type, this, inboundMessage.payload);
  }

  protected publishFrame(frame: Frame): void {
    const filtered = this.frameFilter.apply(frame);
    this.outbound.publish(filtered);
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

      this.runAndPublish();
    }, this.cycleIntervalMs);
  }

  private clearTimer(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  private runAndPublish(): void {
    this.systemManager.runCycle();
    const frame = this.createFrameSnapshot();
    this.publishFrame(frame);
    this.tick += 1;
  }

  private createFrameSnapshot(): Frame {
    const context = this.systemManager.getContext();
    const entities = context.entityManager.list();
    const snapshot: Record<string, Record<string, unknown>> = {};

    for (const entity of entities) {
      snapshot[String(entity)] = this.collectComponents(entity, context.componentManager);
    }

    return {
      tick: this.tick,
      entities: snapshot,
    };
  }

  private collectComponents(
    entity: Entity,
    componentManager: SystemContext['componentManager'],
  ): Record<string, unknown> {
    const components = componentManager.getComponents(entity) as ComponentInstance<unknown>[];
    if (components.length === 0) {
      return {};
    }

    const record: Record<string, unknown> = {};
    for (const component of components) {
      record[component.type.id] = component.payload;
    }
    return record;
  }
}
