import { Player } from '../../player/Player.js';

export interface InboundMessage<TData = unknown> {
  id: string;
  type: string;
  data?: TData;
}

export interface OperationContext<TData = unknown> {
  player: Player;
  message: InboundMessage<TData>;
}

/**
 * Base class for discrete player operations invoked via inbound messaging.
 */
export abstract class Operation<TData = unknown, TResult = unknown> {
  protected constructor(public readonly id: string) {}

  abstract execute(context: OperationContext<TData>): Promise<TResult> | TResult;
}
