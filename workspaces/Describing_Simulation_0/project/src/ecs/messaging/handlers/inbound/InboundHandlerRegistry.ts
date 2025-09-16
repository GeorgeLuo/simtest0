import type { Message } from '../../MessageHandler.js';

export interface InboundMessageHandler<
  TMessage extends Message = Message,
  TContext = void,
> {
  readonly type: TMessage['type'];
  handle(message: TMessage, context: TContext): Promise<void> | void;
}

export class InboundHandlerRegistry<
  TMessage extends Message = Message,
  TContext = void,
> {
  private readonly handlers = new Map<
    TMessage['type'],
    InboundMessageHandler<TMessage, TContext>
  >();

  constructor(handlers: ReadonlyArray<InboundMessageHandler<TMessage, TContext>> = []) {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  register<TSpecific extends TMessage>(
    handler: InboundMessageHandler<TSpecific, TContext>,
  ): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Duplicate inbound handler registered for type "${handler.type}"`);
    }

    this.handlers.set(
      handler.type,
      handler as InboundMessageHandler<TMessage, TContext>,
    );
  }

  resolve(type: TMessage['type']): InboundMessageHandler<TMessage, TContext> | undefined {
    return this.handlers.get(type);
  }
}
