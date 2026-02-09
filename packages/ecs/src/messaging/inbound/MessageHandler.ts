import type { Operation } from './Operation';
import type { SystemContext } from '../../systems/System';
import type { Acknowledgement } from '../outbound/Acknowledgement';

export class MessageHandler<TContext = SystemContext, TPayload = unknown> {
  private readonly operations: Operation<TContext, TPayload>[];

  constructor(operations: Operation<TContext, TPayload>[]) {
    this.operations = operations;
  }

  handle(context: TContext, payload: TPayload): Acknowledgement {
    let acknowledgement: Acknowledgement | null = null;

    for (const operation of this.operations) {
      acknowledgement = operation.execute(context, payload);
    }

    if (!acknowledgement) {
      throw new Error('Inbound operations must return an acknowledgement');
    }

    return acknowledgement;
  }
}
