import { describe, expect, it } from 'vitest';
import {
  InboundHandlerRegistry,
  type InboundMessageHandler,
} from '../../../../src/ecs/messaging/handlers/inbound/InboundHandlerRegistry.js';
import type { Message } from '../../../../src/ecs/messaging/MessageHandler.js';

type TestMessage = Message<string, { value: number }>;
type TestContext = { lastValue?: number };

describe('InboundHandlerRegistry', () => {
  it('registers and resolves handlers for message types', () => {
    const registry = new InboundHandlerRegistry<TestMessage, TestContext>();

    const handler: InboundMessageHandler<TestMessage, TestContext> = {
      type: 'test-message',
      handle(message, context) {
        context.lastValue = message.payload.value;
      },
    };

    registry.register(handler);

    const resolved = registry.resolve('test-message');
    expect(resolved).toBe(handler);

    const context: TestContext = {};
    resolved?.handle(
      {
        id: 'message-1',
        type: 'test-message',
        payload: { value: 42 },
      },
      context,
    );

    expect(context.lastValue).toBe(42);
  });

  it('throws when registering duplicate handler types', () => {
    const registry = new InboundHandlerRegistry<TestMessage, TestContext>();

    const handler: InboundMessageHandler<TestMessage, TestContext> = {
      type: 'test-message',
      handle() {},
    };

    registry.register(handler);

    const duplicate: InboundMessageHandler<TestMessage, TestContext> = {
      type: 'test-message',
      handle() {},
    };

    expect(() => registry.register(duplicate)).toThrowError(
      'Duplicate inbound handler registered for type "test-message"',
    );
  });

  it('returns undefined when resolving unknown handler types', () => {
    const registry = new InboundHandlerRegistry<TestMessage, TestContext>();

    expect(registry.resolve('unknown-type')).toBeUndefined();
  });
});
