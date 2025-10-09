import type { Operation } from './Operation';
import type { SystemContext } from '../../systems/System';

export class MessageHandler<TContext = SystemContext> {
  private readonly operations: Operation<TContext>[];

  constructor(operations: Operation<TContext>[]) {
    this.operations = operations;
  }

  handle(context: TContext, payload: unknown): void {
    for (const operation of this.operations) {
      operation.execute(context, payload);
    }
  }
}
