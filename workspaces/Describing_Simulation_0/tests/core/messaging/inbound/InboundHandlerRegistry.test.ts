import { describe, expect, it } from 'vitest';
import { InboundHandlerRegistry } from '../../../../src/core/messaging/inbound/InboundHandlerRegistry';
import { MessageHandler } from '../../../../src/core/messaging/inbound/MessageHandler';
import { Operation } from '../../../../src/core/messaging/inbound/Operation';
import { Player } from '../../../../src/core/player/Player';

class NoopOperation extends Operation<void, void> {
  constructor() {
    super('noop');
  }

  override execute(): Promise<void> {
    return Promise.resolve();
  }
}

const createHandler = (id: string) => new MessageHandler(id, [new NoopOperation()]);

describe('InboundHandlerRegistry', () => {
  it('registers and retrieves handlers by type', () => {
    const registry = new InboundHandlerRegistry();
    const handler = createHandler('start');
    registry.register(handler);

    expect(registry.get('start')).toBe(handler);
  });

  it('throws when registering duplicate handler types', () => {
    const registry = new InboundHandlerRegistry();
    registry.register(createHandler('start'));

    expect(() => registry.register(createHandler('start'))).toThrow('Handler for type start already registered');
  });

  it('returns undefined for unknown handler', () => {
    const registry = new InboundHandlerRegistry();
    expect(registry.get('missing')).toBeUndefined();
  });

  it('dispatches to matched handler', async () => {
    const registry = new InboundHandlerRegistry();
    const handler = createHandler('start');
    registry.register(handler);

    const player = new Player({ tickIntervalMs: 10 });
    const ack = await registry.dispatch({
      player,
      message: { id: '1', type: 'start' }
    });

    expect(ack.success).toBe(true);
  });

  it('returns error acknowledgement when handler missing', async () => {
    const registry = new InboundHandlerRegistry();
    const player = new Player({ tickIntervalMs: 10 });

    const ack = await registry.dispatch({ player, message: { id: '1', type: 'unknown' } });

    expect(ack.success).toBe(false);
    expect(ack.error).toContain('unknown');
  });
});
