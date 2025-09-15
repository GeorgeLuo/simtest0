import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryBus } from "../src/ecs/messaging/Bus";
import { Message, MessageHandler } from "../src/ecs/messaging/MessageHandler";
import { DefaultInboundHandlerRegistry } from "../src/ecs/messaging/handlers/inbound/implementations/DefaultInboundHandlerRegistry";

class RecordingHandler extends MessageHandler<Message> {
  public readonly messageType = "record" as const;
  public readonly handled: Message[] = [];

  public handle(message: Message): void {
    if (message.type !== this.messageType) {
      throw new Error(`Unexpected message type: ${message.type}`);
    }

    this.handled.push(message);
  }
}

describe("DefaultInboundHandlerRegistry", () => {
  it("registers handlers and resolves them by message type", () => {
    const registry = new DefaultInboundHandlerRegistry<Message>();
    const handler = new RecordingHandler();

    registry.register(handler);

    assert.strictEqual(registry.resolve(handler.messageType), handler);
    assert.deepStrictEqual(Array.from(registry.list()), [handler]);
  });

  it("unregisters handlers and returns undefined for unknown types", () => {
    const registry = new DefaultInboundHandlerRegistry<Message>();
    const handler = new RecordingHandler();

    registry.register(handler);
    registry.unregister(handler.messageType);

    assert.strictEqual(registry.resolve(handler.messageType), undefined);
    assert.deepStrictEqual(Array.from(registry.list()), []);
  });
});

describe("InMemoryBus", () => {
  it("dispatches messages synchronously to all subscribers", () => {
    const bus = new InMemoryBus<string>();
    const received: string[] = [];

    bus.subscribe((message) => received.push(`first:${message}`));
    bus.subscribe((message) => received.push(`second:${message}`));

    bus.publish("payload");

    assert.deepStrictEqual(received, ["first:payload", "second:payload"]);
  });

  it("dispatches inbound messages using registered handlers", () => {
    const bus = new InMemoryBus<Message>();
    const registry = new DefaultInboundHandlerRegistry<Message>();
    const handler = new RecordingHandler();

    registry.register(handler);

    bus.subscribe((message) => {
      const resolved = registry.resolve(message.type);
      resolved?.handle(message);
    });

    const message: Message = {
      type: handler.messageType,
      payload: { value: 42 },
    };

    bus.publish(message);

    assert.deepStrictEqual(handler.handled, [message]);
  });
});
