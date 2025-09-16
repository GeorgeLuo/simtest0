// Shared message and handler abstractions for the messaging layer.
export type MessageType = string;

export type Message<TType extends MessageType = MessageType, TPayload = unknown> = {
  id?: string;
  type: TType;
  payload: TPayload;
};

export interface MessageHandler<
  TMessage extends Message = Message,
  TContext = void,
> {
  readonly type: TMessage['type'];
  handle(message: TMessage, context: TContext): void | Promise<void>;
}
