import { describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../../components/ComponentManager.js";
import { EntityManager } from "../../entity/EntityManager.js";
import { Bus } from "../../messaging/Bus.js";
import { InboundHandlerRegistry } from "../../messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { MessageHandler } from "../../messaging/inbound/MessageHandler.js";
import { OutboundMessage } from "../../messaging/outbound/OutboundMessage.js";
import { Frame } from "../../messaging/outbound/Frame.js";
import { FrameFilter } from "../../messaging/outbound/FrameFilter.js";
import { Acknowledgement } from "../../messaging/outbound/Acknowledgement.js";
import { SystemManager } from "../../systems/SystemManager.js";
import {
  EvaluationPlayer,
  EVALUATION_FRAME_COMPONENT,
  EVALUATION_FRAME_MESSAGE,
} from "../EvaluationPlayer.js";
import { InjectFrameOperation } from "../operations/InjectFrame.js";

interface EvaluationPlayerTestContext {
  player: EvaluationPlayer;
  inboundBus: Bus<InboundMessage>;
  outboundBus: Bus<OutboundMessage>;
  inboundRegistry: InboundHandlerRegistry;
  componentManager: ComponentManager;
  entityManager: EntityManager;
  events: OutboundMessage[];
  dispose: () => void;
}

const createContext = (options?: {
  frameFilter?: FrameFilter;
}): EvaluationPlayerTestContext => {
  const componentManager = new ComponentManager();
  const entityManager = new EntityManager(componentManager);
  const systemManager = new SystemManager();
  const inboundBus = new Bus<InboundMessage>();
  const outboundBus = new Bus<OutboundMessage>();
  const inboundRegistry = new InboundHandlerRegistry();
  const player = new EvaluationPlayer({
    componentManager,
    entityManager,
    systemManager,
    inboundBus,
    outboundBus,
    inboundRegistry,
    frameFilter: options?.frameFilter,
  });

  const events: OutboundMessage[] = [];
  outboundBus.subscribe((event) => {
    events.push(event);
  });

  return {
    player,
    inboundBus,
    outboundBus,
    inboundRegistry,
    componentManager,
    entityManager,
    events,
    dispose: () => player.dispose(),
  };
};

const isAcknowledgementEvent = (
  event: OutboundMessage,
): event is { type: "acknowledgement"; acknowledgement: Acknowledgement } =>
  event.type === "acknowledgement";

const waitForAck = async (
  events: OutboundMessage[],
  messageId: string,
  status: "success" | "error" = "success",
) => {
  await vi.waitFor(() => {
    const acknowledgementEvent = events
      .filter(isAcknowledgementEvent)
      .find((event) => event.acknowledgement.messageId === messageId);
    expect(acknowledgementEvent).toBeDefined();
    expect(acknowledgementEvent?.acknowledgement.status).toBe(status);
  });
};

const publishFrameMessage = (
  ctx: EvaluationPlayerTestContext,
  frame: Frame,
  id: string,
) => {
  const message: InboundMessage = {
    id,
    type: EVALUATION_FRAME_MESSAGE,
    payload: {
      frame,
    },
  };
  ctx.inboundBus.publish(message);
  return message;
};

describe("EvaluationPlayer", () => {
  it("registers the evaluation frame handler on construction", () => {
    const ctx = createContext();

    expect(ctx.inboundRegistry.get(EVALUATION_FRAME_MESSAGE)).toBeDefined();

    ctx.dispose();
  });

  it("stores ingested frames as component instances and acknowledges success", async () => {
    const ctx = createContext();
    const frameA: Frame = { tick: 1, entities: [] };
    const frameB: Frame = { tick: 2, entities: [] };

    const msgA = publishFrameMessage(ctx, frameA, "frame-a");
    await waitForAck(ctx.events, msgA.id);

    const msgB = publishFrameMessage(ctx, frameB, "frame-b");
    await waitForAck(ctx.events, msgB.id);

    const entities = ctx.componentManager.getEntitiesWithComponent(
      EVALUATION_FRAME_COMPONENT,
    );
    expect(entities).toHaveLength(2);

    const storedFrames = entities.map((entity) =>
      ctx.componentManager.getComponent(entity, EVALUATION_FRAME_COMPONENT),
    );

    expect(storedFrames).toContainEqual(frameA);
    expect(storedFrames).toContainEqual(frameB);

    ctx.dispose();
  });

  it("applies the frame filter before publishing outbound frames", async () => {
    const filteredFrame: Frame = { tick: 99, entities: [] };
    const frameFilter: FrameFilter = {
      apply: vi.fn(() => filteredFrame),
    };
    const ctx = createContext({ frameFilter });
    const frame: Frame = { tick: 10, entities: [] };

    const message = publishFrameMessage(ctx, frame, "filter-test");
    await waitForAck(ctx.events, message.id);

    expect(frameFilter.apply).toHaveBeenCalledTimes(1);
    expect(frameFilter.apply).toHaveBeenCalledWith(
      expect.objectContaining({ tick: frame.tick }),
    );

    const frameEvents = ctx.events.filter(
      (event): event is { type: "frame"; frame: Frame } =>
        event.type === "frame",
    );
    expect(frameEvents.at(-1)?.frame).toBe(filteredFrame);

    ctx.dispose();
  });

  it("surfaces error acknowledgements when frame ingestion throws", async () => {
    const ctx = createContext();
    const originalHandler = ctx.inboundRegistry.get(EVALUATION_FRAME_MESSAGE);
    expect(originalHandler).toBeDefined();

    if (!originalHandler) {
      return;
    }

    const failingHandler = new MessageHandler([new InjectFrameOperation()]);
    const ingestSpy = vi
      .spyOn(ctx.player, "ingestFrame")
      .mockImplementation(() => {
        throw new Error("failed to ingest");
      });
    ctx.inboundRegistry.register(EVALUATION_FRAME_MESSAGE, failingHandler);

    const message = publishFrameMessage(ctx, { tick: 5, entities: [] }, "fail");
    await waitForAck(ctx.events, message.id, "error");

    ingestSpy.mockRestore();
    ctx.dispose();
  });
});
