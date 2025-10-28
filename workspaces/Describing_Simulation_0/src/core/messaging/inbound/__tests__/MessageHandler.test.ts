import { MessageHandler } from '../MessageHandler';
import type { Operation } from '../Operation';

describe('MessageHandler', () => {
  it('executes operations sequentially with shared context', () => {
    const calls: string[] = [];
    const context = { value: 'context' };
    const operations: Operation<typeof context, string>[] = [
      {
        execute(ctx, payload) {
          calls.push(`first:${payload}:${ctx === context}`);
          return { messageId: `first-${payload}`, status: 'success' as const };
        },
      },
      {
        execute(ctx, payload) {
          calls.push(`second:${payload}:${ctx === context}`);
          return { messageId: `second-${payload}`, status: 'success' as const };
        },
      },
    ];

    const handler = new MessageHandler<typeof context>(operations);
    const acknowledgement = handler.handle(context, 'payload');

    expect(calls).toEqual(['first:payload:true', 'second:payload:true']);
    expect(acknowledgement).toEqual({ messageId: 'second-payload', status: 'success' });
  });
});
