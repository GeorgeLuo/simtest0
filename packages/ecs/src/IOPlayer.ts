import { Player } from './Player';
import type { SystemManager } from './systems/SystemManager';
import type { Bus } from './messaging/Bus';
import type { Frame } from './messaging/outbound/Frame';
import type { FrameFilter } from './messaging/outbound/FrameFilter';
import type { Acknowledgement } from './messaging/outbound/Acknowledgement';
import { InboundHandlerRegistry } from './messaging/inbound/InboundHandlerRegistry';
import type { SystemContext } from './systems/System';
import type { Entity } from './entity/Entity';
import type { ComponentInstance } from './components/ComponentType';

interface InboundMessage {
  type?: string;
  payload?: unknown;
}

type OutboundMessage = Frame | Acknowledgement;

export class IOPlayer extends Player {
  private readonly inbound: Bus<unknown>;
  private readonly outbound: Bus<OutboundMessage>;
  private readonly frameFilter: FrameFilter;
  private readonly handlers: InboundHandlerRegistry<IOPlayer>;
  private readonly unsubscribeInbound: () => void;
  private readonly componentBuffer: ComponentInstance<unknown>[] = [];

  constructor(
    systemManager: SystemManager,
    inbound: Bus<unknown>,
    outbound: Bus<OutboundMessage>,
    frameFilter: FrameFilter,
    handlers?: InboundHandlerRegistry<IOPlayer>,
    cycleIntervalMs?: number,
  ) {
    super(systemManager, cycleIntervalMs);
    this.inbound = inbound;
    this.outbound = outbound;
    this.frameFilter = frameFilter;
    this.handlers = handlers ?? new InboundHandlerRegistry<IOPlayer>();
    this.unsubscribeInbound = this.inbound.subscribe((message) => this.handleInbound(message));
  }

  protected getInboundHandlers(): InboundHandlerRegistry<IOPlayer> {
    return this.handlers;
  }

  protected override onAfterCycle(tick: number, context: SystemContext): void {
    const frame = this.createFrameSnapshot(tick, context);
    this.publishFrame(frame);
  }

  protected handleInbound(message: unknown): void {
    const inboundMessage = message as InboundMessage | undefined;
    if (!inboundMessage || typeof inboundMessage.type !== 'string') {
      return;
    }

    try {
      const acknowledgement = this.handlers.handle(inboundMessage.type, this, inboundMessage.payload);
      if (acknowledgement) {
        this.outbound.publish(acknowledgement);
      }
    } catch (error) {
      const messageId = extractMessageId(inboundMessage.payload);
      if (!messageId) {
        return;
      }

      this.outbound.publish({
        messageId,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  protected publishFrame(frame: Frame): void {
    const filtered = this.frameFilter.apply(frame);
    this.outbound.publish(filtered);
  }

  private createFrameSnapshot(tick: number, context: SystemContext): Frame {
    const snapshot: Record<string, Record<string, unknown>> = Object.create(null);
    const entityManager = context.entityManager;
    const componentManager = context.componentManager;

    entityManager.forEach((entity: Entity) => {
      snapshot[String(entity)] = this.collectComponents(entity, componentManager);
    });

    return {
      tick,
      entities: snapshot,
    };
  }

  private collectComponents(
    entity: Entity,
    componentManager: SystemContext['componentManager'],
  ): Record<string, unknown> {
    const componentCount = componentManager.collectComponents(entity, this.componentBuffer);
    if (componentCount === 0) {
      return Object.create(null);
    }

    const record: Record<string, unknown> = Object.create(null);
    for (let index = 0; index < componentCount; index += 1) {
      const component = this.componentBuffer[index];
      record[component.type.id] = component.payload;
    }
    return record;
  }

}

function extractMessageId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = (payload as { messageId?: unknown }).messageId;
  return typeof candidate === 'string' && candidate ? candidate : null;
}
