import { Player, type LoopController } from "./Player";
import type { EntityManager } from "../entity/EntityManager";
import type { ComponentManager } from "../components/ComponentManager";
import type { SystemManager } from "../systems/management/SystemManager";
import type { Bus } from "../messaging/Bus";
import { FrameFilter } from "../messaging/outbound/FrameFilter";
import type { Frame } from "../messaging/outbound/Frame";
import type { Acknowledgement } from "../messaging/outbound/Acknowledgement";
import { acknowledgeFailure, acknowledgeSuccess } from "../messaging/outbound/Acknowledgement";
import { InboundHandlerRegistry } from "../messaging/inbound/InboundHandlerRegistry";
import { MessageHandler } from "../messaging/inbound/MessageHandler";
import type { Operation } from "../messaging/inbound/Operation";
import type { ComponentType } from "../components/ComponentType";

export type CommandMessage<TType extends string = string, TPayload = unknown> = {
  id: string;
  type: TType;
  payload?: TPayload;
};

export type OutboundEvent =
  | { kind: "frame"; frame: Frame }
  | { kind: "ack"; ack: Acknowledgement };

export class IOPlayer extends Player {
  #registry: InboundHandlerRegistry<string, IOPlayer, CommandMessage, Acknowledgement>;
  #filter: FrameFilter;
  #outbound: Bus<OutboundEvent>;
  #inboundUnsubscribe?: () => void;
  #lastTick = 0;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    loop: LoopController,
    inbound: Bus<CommandMessage>,
    outbound: Bus<OutboundEvent>,
    options?: { filter?: FrameFilter; registry?: InboundHandlerRegistry<string, IOPlayer, CommandMessage, Acknowledgement> },
  ) {
    super(entities, components, systems, loop, { inbound, outbound });
    this.#filter = options?.filter ?? new FrameFilter();
    this.#registry = options?.registry ?? new InboundHandlerRegistry();
    this.#outbound = outbound;

    this.#inboundUnsubscribe = inbound.subscribe((message) => {
      void this.handleInbound(message);
    });
  }

  override pause(): void {
    super.pause();
  }

  override stop(): void {
    super.stop();
    this.publishFrame();
  }

  protected override onLoopTick(): void {
    super.onLoopTick();
    this.publishFrame();
  }

  register(type: string, operations: ReadonlyArray<Operation<IOPlayer, CommandMessage>>): void {
    const handler = new MessageHandler<IOPlayer, CommandMessage, Acknowledgement>(
      operations,
      (message) => acknowledgeSuccess(message.id),
    );
    this.#registry.register(type, handler);
  }

  private async handleInbound(message: CommandMessage): Promise<void> {
    const handler = this.#registry.get(message.type);
    if (!handler) {
      this.emitAck(acknowledgeFailure(message.id, `Unsupported command type: ${message.type}`));
      return;
    }

    try {
      const response = await handler.handle(this, message);
      this.emitAck(response);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.emitAck(acknowledgeFailure(message.id, reason));
    }
  }

  private emitAck(ack: Acknowledgement): void {
    this.#outbound.send({ kind: "ack", ack });
  }

  protected publishFrame(): void {
    const frame = this.buildFrame();
    this.#outbound.send({ kind: "frame", frame });
  }

  protected buildFrame(): Frame {
    const entities: Frame["entities"] = [];
    let observedTick = this.#lastTick;

    let entityCount = 0;

    this.entities.forEach((entity) => {
      entityCount += 1;
      let record: Record<string, unknown> | undefined;

      this.components.forEach(entity, (type, value) => {
        if (!this.#filter.shouldInclude(type, value)) {
          return;
        }

        const filtered = this.#filter.transform(type, value);
        if (filtered === undefined) {
          return;
        }

        if (!record) {
          record = {};
        }

        record[(type as ComponentType<unknown>).id] = filtered;
        if (typeof filtered === "object" && filtered !== null && "tick" in (filtered as Record<string, unknown>)) {
          const maybeTick = (filtered as Record<string, unknown>).tick;
          if (typeof maybeTick === "number") {
            observedTick = maybeTick;
          }
        }
      });

      entities.push({ id: entity, components: record ?? {} });
    });

    if (entityCount === 0) {
      observedTick = 0;
    }

    this.#lastTick = observedTick;
    return {
      tick: observedTick,
      entities,
    };
  }

  dispose(): void {
    this.#inboundUnsubscribe?.();
    this.#inboundUnsubscribe = undefined;
  }
}
