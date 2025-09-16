import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { Bus } from '../../../src/ecs/messaging/Bus.js';
import type {
  MessageHandler,
  MessageTypeMap,
} from '../../../src/ecs/messaging/MessageHandler.js';

// Test intents:
// - Verify that handlers registered for a message type receive dispatched payloads.
// - Confirm that removing handlers prevents them from observing future dispatches.
// - Demonstrate that TypeScript enforces payload shapes for declared message types.

type SimulationMessages = {
  entityCreated: {
    id: number;
    position: { x: number; y: number };
  };
  componentChanged: {
    entityId: number;
    component: string;
    diff: Record<string, unknown>;
  };
};

describe('Bus', () => {
  it('notifies every handler registered for a message type', () => {
    const bus = new Bus<SimulationMessages>();
    const handlerA = vi.fn<MessageHandler<SimulationMessages, 'entityCreated'>>();
    const handlerB = vi.fn<MessageHandler<SimulationMessages, 'entityCreated'>>();
    const unrelated = vi.fn<MessageHandler<SimulationMessages, 'componentChanged'>>();

    bus.on('entityCreated', handlerA);
    bus.on('entityCreated', handlerB);
    bus.on('componentChanged', unrelated);

    const payload: SimulationMessages['entityCreated'] = {
      id: 7,
      position: { x: 12, y: -4 },
    };

    bus.dispatch('entityCreated', payload);

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerA).toHaveBeenCalledWith(payload);
    expect(handlerB).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledWith(payload);
    expect(unrelated).not.toHaveBeenCalled();
  });

  it('supports removing handlers via disposers returned from registration', () => {
    const bus = new Bus<SimulationMessages>();
    const handler = vi.fn<MessageHandler<SimulationMessages, 'componentChanged'>>();

    const dispose = bus.on('componentChanged', handler);
    bus.dispatch('componentChanged', {
      entityId: 1,
      component: 'position',
      diff: { x: 2 },
    });

    dispose();
    bus.dispatch('componentChanged', {
      entityId: 1,
      component: 'position',
      diff: { x: 3 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('exposes TypeScript types that preserve the declared payload structure', () => {
    const bus = new Bus<SimulationMessages>();

    const handler: MessageHandler<SimulationMessages, 'componentChanged'> = (
      payload,
    ) => {
      expectTypeOf(payload.entityId).toEqualTypeOf<number>();
      expectTypeOf(payload.diff).toEqualTypeOf<Record<string, unknown>>();
    };

    bus.on('componentChanged', handler);
    bus.dispatch('componentChanged', {
      entityId: 5,
      component: 'rendering',
      diff: { opacity: 0.4 },
    });

    const typingOnlyBus = new Bus<SimulationMessages>();

    // @ts-expect-error - Payloads must include all required fields for the message type.
    typingOnlyBus.dispatch('componentChanged', { entityId: 3 });

    // @ts-expect-error - Message identifiers are limited to declared keys.
    typingOnlyBus.on('unknownMessage', handler as MessageHandler<MessageTypeMap, string>);
  });
});
