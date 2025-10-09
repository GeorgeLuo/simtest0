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
        },
      },
      {
        execute(ctx, payload) {
          calls.push(`second:${payload}:${ctx === context}`);
        },
      },
    ];

    const handler = new MessageHandler<typeof context>(operations);
    handler.handle(context, 'payload');

    expect(calls).toEqual(['first:payload:true', 'second:payload:true']);
  });
});
