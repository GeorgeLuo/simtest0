import { describe, expect, it, vi } from 'vitest';
import { Player } from '../../../../src/core/player/Player';
import { MessageHandler } from '../../../../src/core/messaging/inbound/MessageHandler';
import { Operation } from '../../../../src/core/messaging/inbound/Operation';
import { Acknowledgement } from '../../../../src/core/messaging/outbound/Acknowledgement';

class TestOperation extends Operation<{ value: number }, { value: number }> {
  constructor(id: string, private readonly fn: (value: number) => number) {
    super(id);
  }

  override async execute({ message }: { message: { data?: { value: number } } }): Promise<{ value: number }> {
    const input = message.data?.value ?? 0;
    return { value: this.fn(input) };
  }
}

describe('MessageHandler', () => {
  it('executes operations sequentially and returns success acknowledgement', async () => {
    const player = new Player({ tickIntervalMs: 10 });
    const double = new TestOperation('double', (x) => x * 2);
    const increment = new TestOperation('increment', (x) => x + 1);

    const handler = new MessageHandler('chain', [double, increment]);

    const ack = await handler.handle({
      player,
      message: {
        id: 'msg-1',
        type: 'chain',
        data: { value: 2 }
      }
    });

    expect(ack).toBeInstanceOf(Acknowledgement);
    expect(ack.success).toBe(true);
    expect(ack.payload).toEqual({ value: 5 });
  });

  it('returns error acknowledgement when an operation throws', async () => {
    const player = new Player({ tickIntervalMs: 10 });
    const okOp = new TestOperation('ok', (x) => x);
    const failingOp = new TestOperation('fail', () => {
      throw new Error('boom');
    });

    const handler = new MessageHandler('chain', [okOp, failingOp]);

    const ack = await handler.handle({
      player,
      message: {
        id: 'msg-2',
        type: 'chain',
        data: { value: 1 }
      }
    });

    expect(ack.success).toBe(false);
    expect(ack.error).toContain('boom');
  });

  it('executes operations with shared context', async () => {
    const player = new Player({ tickIntervalMs: 10 });
    const spy = vi.fn();

    class SpyOperation extends Operation<void, void> {
      constructor() {
        super('spy');
      }

      override async execute(context: { player: Player }): Promise<void> {
        spy(context.player);
      }
    }

    const handler = new MessageHandler('spy', [new SpyOperation()]);
    await handler.handle({
      player,
      message: { id: 'msg', type: 'spy' }
    });

    expect(spy).toHaveBeenCalledWith(player);
  });
});
