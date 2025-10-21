import { describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { ComponentType } from "../components/ComponentType.js";
import { EntityManager } from "../entity/EntityManager.js";
import { IOPlayer } from "../IOPlayer.js";
import { Bus } from "../messaging/Bus.js";
import { InboundHandlerRegistry } from "../messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "../messaging/inbound/InboundMessage.js";
import { MessageHandler } from "../messaging/inbound/MessageHandler.js";
import { Operation } from "../messaging/inbound/Operation.js";
import { FrameFilter } from "../messaging/outbound/FrameFilter.js";
import { OutboundMessage } from "../messaging/outbound/OutboundMessage.js";
import { SystemManager } from "../systems/SystemManager.js";

describe("IOPlayer", () => {
  const createPlayer = (options?: { frameFilter?: FrameFilter }) => {
    const componentManager = new ComponentManager();
    const entityManager = new EntityManager(componentManager);
    const systemManager = new SystemManager();
    const inboundBus = new Bus<InboundMessage>();
    const outboundBus = new Bus<OutboundMessage>();
    const registry = new InboundHandlerRegistry();

    const player = new IOPlayer({
      entityManager,
      componentManager,
      systemManager,
      inboundBus,
      outboundBus,
      inboundRegistry: registry,
      frameFilter: options?.frameFilter,
    });

    const dispose = () => player.dispose();

    return {
      player,
      componentManager,
      entityManager,
      systemManager,
      inboundBus,
      outboundBus,
      registry,
      dispose,
    };
  };

  it("dispatches inbound operations and emits acknowledgements", async () => {
    const ctx = createPlayer();
    const operation: Operation = {
      execute: vi.fn(),
    };
    ctx.registry.register(
      "noop",
      new MessageHandler([operation]),
    );

    const events: OutboundMessage[] = [];
    ctx.outboundBus.subscribe((event) => {
      events.push(event);
    });

    const message: InboundMessage = {
      id: "m-1",
      type: "noop",
      payload: null,
    };

    ctx.inboundBus.publish(message);

    await vi.waitFor(() => {
      expect(operation.execute).toHaveBeenCalledOnce();
      const ackEvent = events.find((event) => event.type === "acknowledgement");
      expect(ackEvent?.acknowledgement.status).toBe("success");
      expect(ackEvent?.acknowledgement.messageId).toBe("m-1");
    });

    ctx.dispose();
  });

  it("returns error acknowledgement when no handler exists", async () => {
    const ctx = createPlayer();
    const events: OutboundMessage[] = [];
    ctx.outboundBus.subscribe((event) => {
      events.push(event);
    });

    ctx.inboundBus.publish({ id: "missing", type: "unknown", payload: {} });

    await vi.waitFor(() => {
      const ackEvent = events.find((event) => event.type === "acknowledgement");
      expect(ackEvent?.acknowledgement.status).toBe("error");
      expect(ackEvent?.acknowledgement.messageId).toBe("missing");
    });

    ctx.dispose();
  });

  it("emits filtered frames after each step", () => {
    const filter: FrameFilter = {
      apply: vi.fn((frame) => frame),
    };
    const ctx = createPlayer({ frameFilter: filter });

    const componentType = new ComponentType<{ value: number }>("test.component");
    const entity = ctx.entityManager.createEntity();
    ctx.componentManager.addComponent(entity, componentType, { value: 5 });

    const events: OutboundMessage[] = [];
    ctx.outboundBus.subscribe((event) => {
      events.push(event);
    });

    ctx.player.start();
    ctx.player.step();

    const frameEvent = events.find((event) => event.type === "frame");
    expect(frameEvent?.frame.tick).toBe(1);
    expect(filter.apply).toHaveBeenCalledOnce();
    expect(frameEvent?.frame.entities[0].components[0]).toEqual({
      type: componentType.key,
      data: { value: 5 },
    });

    ctx.player.stop();
    ctx.dispose();
  });
});
