import { InboundHandlerRegistry } from '../InboundHandlerRegistry';
import { MessageHandler } from '../MessageHandler';
import type { SystemContext } from '../../../systems/System';

describe('InboundHandlerRegistry', () => {
  it('routes handle calls to registered handler', () => {
    const calls: string[] = [];
    const context: SystemContext = { entityManager: {} as never, componentManager: {} as never };

    const handlerA = new MessageHandler([
      {
        execute(_, payload) {
          calls.push(`A:${payload}`);
          return { messageId: `ack-${payload}`, status: 'success' as const };
        },
      },
    ]);

    const handlerB = new MessageHandler([
      {
        execute(_, payload) {
          calls.push(`B:${payload}`);
          return { messageId: `ack-${payload}`, status: 'success' as const };
        },
      },
    ]);

    const registry = new InboundHandlerRegistry();
    registry.register('alpha', handlerA);
    registry.register('beta', handlerB);

    const ackA = registry.handle('alpha', context, 'payload1');
    const ackB = registry.handle('beta', context, 'payload2');

    expect(calls).toEqual(['A:payload1', 'B:payload2']);
    expect(ackA).toEqual({ messageId: 'ack-payload1', status: 'success' });
    expect(ackB).toEqual({ messageId: 'ack-payload2', status: 'success' });
  });

  it('ignores unknown message types', () => {
    const context: SystemContext = { entityManager: {} as never, componentManager: {} as never };
    const registry = new InboundHandlerRegistry();

    const acknowledgement = registry.handle('missing', context, 'payload');
    expect(acknowledgement).toBeNull();
  });
});
