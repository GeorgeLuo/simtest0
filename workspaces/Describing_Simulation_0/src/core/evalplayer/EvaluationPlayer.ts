import { ComponentManager } from "../components/ComponentManager.js";
import { ComponentType } from "../components/ComponentType.js";
import { EntityManager } from "../entity/EntityManager.js";
import { IOPlayer } from "../IOPlayer.js";
import { Bus } from "../messaging/Bus.js";
import { InboundHandlerRegistry } from "../messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "../messaging/inbound/InboundMessage.js";
import { MessageHandler } from "../messaging/inbound/MessageHandler.js";
import { OutboundMessage } from "../messaging/outbound/OutboundMessage.js";
import { Frame } from "../messaging/outbound/Frame.js";
import { FrameFilter } from "../messaging/outbound/FrameFilter.js";
import { SystemManager } from "../systems/SystemManager.js";
import { InjectFrameOperation } from "./operations/InjectFrame.js";
import { EVALUATION_FRAME_MESSAGE } from "./messages.js";
export { EVALUATION_FRAME_MESSAGE } from "./messages.js";

export const EVALUATION_FRAME_COMPONENT = new ComponentType<Frame>(
  "evaluation.frame.component",
);

export interface EvaluationPlayerOptions {
  readonly entityManager: EntityManager;
  readonly componentManager: ComponentManager;
  readonly systemManager: SystemManager;
  readonly inboundBus: Bus<InboundMessage>;
  readonly outboundBus: Bus<OutboundMessage>;
  readonly inboundRegistry: InboundHandlerRegistry;
  readonly frameFilter?: FrameFilter;
}

export class EvaluationPlayer extends IOPlayer {
  constructor(options: EvaluationPlayerOptions) {
    super(options);
    this.registerFrameHandler(options.inboundRegistry);
  }

  ingestFrame(frame: Frame): void {
    const entity = this.entityManager.createEntity();
    this.componentManager.addComponent(
      entity,
      EVALUATION_FRAME_COMPONENT,
      frame,
    );
    this.publishEvaluations();
  }

  protected publishEvaluations(): void {
    const entities = this.componentManager.getEntitiesWithComponent(
      EVALUATION_FRAME_COMPONENT,
    );
    const latestEntity = entities.at(-1);
    if (!latestEntity) {
      return;
    }

    const latestFrame = this.componentManager.getComponent(
      latestEntity,
      EVALUATION_FRAME_COMPONENT,
    );
    if (!latestFrame) {
      return;
    }

    const filtered = this.frameFilter.apply(latestFrame);
    this.outboundBus.publish({
      type: "frame",
      frame: filtered,
    });
  }

  private registerFrameHandler(registry: InboundHandlerRegistry): void {
    const handler = new MessageHandler([new InjectFrameOperation()]);
    registry.register(EVALUATION_FRAME_MESSAGE, handler);
  }
}
