import { describe, expect, it, vi } from "vitest";
import { InboundHandlerRegistry } from "../src/core/messaging/inbound/InboundHandlerRegistry";
import { MessageHandler } from "../src/core/messaging/inbound/MessageHandler";
import type { Operation } from "../src/core/messaging/inbound/Operation";

describe("Inbound handlers", () => {
  it("registers and retrieves handlers", () => {
    const registry = new InboundHandlerRegistry<string, string, string, string>();
    const handler = new MessageHandler<string, string, string>([], (message) => message.toUpperCase());

    registry.register("foo", handler);

    expect(registry.get("foo")).toBe(handler);
  });

  it("replaces handlers on duplicate register", () => {
    const registry = new InboundHandlerRegistry<string, string, string, string>();
    const handlerA = new MessageHandler<string, string, string>([], (message) => message);
    const handlerB = new MessageHandler<string, string, string>([], (message) => `${message}!`);

    registry.register("foo", handlerA);
    registry.register("foo", handlerB);

    expect(registry.get("foo")).toBe(handlerB);
  });

  it("executes operations sequentially", async () => {
    const order: number[] = [];
    const op = (index: number): Operation<string, string> => ({
      execute: (_context, _message) => {
        order.push(index);
        return index;
      },
    });

    const handler = new MessageHandler<string, string, string>([
      op(1),
      op(2),
      op(3),
    ], (message, result) => `${message}:${result}`);

    const response = await handler.handle("ctx", "cmd");
    expect(order).toEqual([1, 2, 3]);
    expect(response).toBe("cmd:3");
  });

  it("supports async operations", async () => {
    const asyncOp: Operation<string, string> = {
      execute: async () => {
        await Promise.resolve();
        return "done";
      },
    };

    const handler = new MessageHandler<string, string, string>([
      asyncOp,
    ], (_message, result) => (result as string).toUpperCase());

    const response = await handler.handle("ctx", "cmd");
    expect(response).toBe("DONE");
  });

  it("passes context and message to operations", async () => {
    const op: Operation<{ track: vi.Mock }, string> = {
      execute: (context, message) => {
        context.track(message);
      },
    };

    const tracker = vi.fn();
    const handler = new MessageHandler<{ track: vi.Mock }, string, string>([op], (msg) => msg);

    await handler.handle({ track: tracker }, "payload");
    expect(tracker).toHaveBeenCalledWith("payload");
  });
});
