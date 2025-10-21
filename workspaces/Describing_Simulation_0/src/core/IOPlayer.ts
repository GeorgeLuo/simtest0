import { ComponentManager } from "./components/ComponentManager.js";
import { EntityManager } from "./entity/EntityManager.js";
import { Player } from "./Player.js";
import { Bus } from "./messaging/Bus.js";
import { InboundHandlerRegistry } from "./messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "./messaging/inbound/InboundMessage.js";
import { Frame } from "./messaging/outbound/Frame.js";
import {
  FrameFilter,
  IdentityFrameFilter,
} from "./messaging/outbound/FrameFilter.js";
import { OutboundMessage } from "./messaging/outbound/OutboundMessage.js";
import { errorAck } from "./messaging/outbound/Acknowledgement.js";
import { SystemManager } from "./systems/SystemManager.js";

interface IOPlayerOptions {
  entityManager: EntityManager;
  componentManager: ComponentManager;
  systemManager: SystemManager;
  inboundBus: Bus<InboundMessage>;
  outboundBus: Bus<OutboundMessage>;
  inboundRegistry: InboundHandlerRegistry;
  frameFilter?: FrameFilter;
}

export class IOPlayer extends Player {
  private readonly unsubscribeInbound: () => void;
  protected readonly frameFilter: FrameFilter;

  constructor(options: IOPlayerOptions) {
    const {
      entityManager,
      componentManager,
      systemManager,
      inboundBus,
      outboundBus,
      inboundRegistry,
      frameFilter,
    } = options;

    super(entityManager, componentManager, systemManager);
    this.outboundBus = outboundBus;
    this.inboundRegistry = inboundRegistry;
    this.frameFilter = frameFilter ?? new IdentityFrameFilter();

    this.unsubscribeInbound = inboundBus.subscribe((message) => {
      void this.handleInbound(message);
    });
  }

  protected readonly outboundBus: Bus<OutboundMessage>;
  private readonly inboundRegistry: InboundHandlerRegistry;

  dispose(): void {
    this.unsubscribeInbound();
  }

  protected override onAfterStep(): void {
    this.emitFrame();
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    const handler = this.inboundRegistry.get(message.type);
    if (!handler) {
      this.outboundBus.publish({
        type: "acknowledgement",
        acknowledgement: errorAck(
          message.id,
          `No handler registered for message type '${message.type}'`,
        ),
      });
      return;
    }

    const acknowledgement = await handler.handle(this, message);
    this.outboundBus.publish({
      type: "acknowledgement",
      acknowledgement,
    });
  }

  private emitFrame(): void {
    const entities: Frame["entities"] = [];
    this.entityManager.forEachEntity((entity) => {
      const serializedComponents: Array<{ type: string; data: unknown }> = [];
      this.componentManager.forEachComponent(entity, (component) => {
        serializedComponents.push({
          type: component.type.key,
          data: component.data,
        });
      });

      entities.push({
        id: entity,
        components: serializedComponents,
      });
    });

    const frame: Frame = {
      tick: this.getTick(),
      entities,
    };

    const filtered = this.frameFilter.apply(frame);

    this.outboundBus.publish({
      type: "frame",
      frame: filtered,
    });
  }
}
