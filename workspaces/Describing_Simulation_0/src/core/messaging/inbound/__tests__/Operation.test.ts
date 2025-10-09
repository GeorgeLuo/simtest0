import type { Operation } from '../Operation';
import type { SystemContext } from '../../../systems/System';

describe('Operation', () => {
  it('represents execute contract with context and payload', () => {
    const calls: Array<{ context: SystemContext; payload: number }> = [];
    const operation: Operation<SystemContext, number> = {
      execute(context, payload) {
        calls.push({ context, payload });
      },
    };

    const context = { entityManager: {} as never, componentManager: {} as never } satisfies SystemContext;
    operation.execute(context, 42);

    expect(calls).toEqual([{ context, payload: 42 }]);
  });
});
