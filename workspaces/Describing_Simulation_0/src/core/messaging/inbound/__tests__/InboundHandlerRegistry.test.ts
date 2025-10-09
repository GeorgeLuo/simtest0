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
        },
      },
    ]);

    const handlerB = new MessageHandler([
      {
        execute(_, payload) {
          calls.push(`B:${payload}`);
        },
      },
    ]);

    const registry = new InboundHandlerRegistry();
    registry.register('alpha', handlerA);
    registry.register('beta', handlerB);

    registry.handle('alpha', context, 'payload1');
    registry.handle('beta', context, 'payload2');

    expect(calls).toEqual(['A:payload1', 'B:payload2']);
  });

  it('ignores unknown message types', () => {
    const context: SystemContext = { entityManager: {} as never, componentManager: {} as never };
    const registry = new InboundHandlerRegistry();

    expect(() => registry.handle('missing', context, 'payload')).not.toThrow();
  });
});
