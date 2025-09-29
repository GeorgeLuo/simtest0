import { describe, expect, it, vi } from 'vitest';
import { OperationContext, Operation } from '../../../../src/core/messaging/inbound/Operation';
import { Player } from '../../../../src/core/player/Player';

describe('Operation', () => {
  it('requires execute to be implemented by subclasses', () => {
    class ExampleOperation extends Operation<{ value: number }, { doubled: number }> {
      constructor() {
        super('example');
      }

      override async execute(context: OperationContext<{ value: number }>): Promise<{ doubled: number }> {
        const input = context.message.data?.value ?? 0;
        return { doubled: input * 2 };
      }
    }

    const operation = new ExampleOperation();
    const player = new Player({ tickIntervalMs: 10 });

    const resultPromise = operation.execute({
      player,
      message: {
        id: 'msg',
        type: 'example',
        data: { value: 3 }
      }
    });

    return expect(resultPromise).resolves.toEqual({ doubled: 6 });
  });

  it('exposes metadata id for registry lookups', () => {
    class ExampleOperation extends Operation<void, void> {
      constructor() {
        super('example');
      }

      override execute(): Promise<void> {
        return Promise.resolve();
      }
    }

    const operation = new ExampleOperation();
    expect(operation.id).toBe('example');
  });
});
