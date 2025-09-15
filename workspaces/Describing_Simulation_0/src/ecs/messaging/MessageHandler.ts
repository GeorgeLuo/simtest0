export interface Message<TType extends string = string, TPayload = unknown> {
  readonly id?: string;
  readonly type: TType;
  readonly payload: TPayload;
}

/**
 * Base class for messages handlers bound to a specific message type.
 */
export abstract class MessageHandler<TMessage extends Message = Message> {
  public abstract readonly messageType: TMessage["type"];

  public abstract handle(message: TMessage): void;
}
