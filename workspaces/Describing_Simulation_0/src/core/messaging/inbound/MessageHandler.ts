import { Acknowledgement } from '../outbound/Acknowledgement.js';
import { InboundMessage, Operation, OperationContext } from './Operation.js';
import { Player } from '../../player/Player.js';

export interface HandlerInvocation<TData = unknown> {
  player: Player;
  message: InboundMessage<TData>;
}

/**
 * Coordinates execution of a sequence of operations mapped to an inbound message type.
 */
export class MessageHandler<TData = unknown, TResult = unknown> {
  constructor(
    public readonly type: string,
    private readonly operations: Array<Operation<TData, TResult>>
  ) {}

  async handle(invocation: HandlerInvocation<TData>): Promise<Acknowledgement<TResult | undefined>> {
    const workingMessage: InboundMessage<TData | TResult> = { ...invocation.message };
    let lastResult: TResult | undefined;

    try {
      for (const operation of this.operations) {
        const context: OperationContext<TData | TResult> = {
          player: invocation.player,
          message: workingMessage as InboundMessage<TData | TResult>
        };

        const result = await operation.execute(context as OperationContext<TData>);
        if (result !== undefined) {
          workingMessage.data = result as TResult;
          lastResult = result as TResult;
        }
      }

      return Acknowledgement.success(invocation.message.id, lastResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Acknowledgement.error(invocation.message.id, message);
    }
  }
}
