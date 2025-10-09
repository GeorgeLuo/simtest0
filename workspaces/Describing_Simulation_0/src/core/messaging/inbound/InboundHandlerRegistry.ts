import type { MessageHandler } from './MessageHandler';

export class InboundHandlerRegistry<TContext = unknown> {
  private readonly handlers: Map<string, MessageHandler<TContext>>;

  constructor(handlers: Map<string, MessageHandler<TContext>> = new Map()) {
    this.handlers = new Map(handlers);
  }

  register(type: string, handler: MessageHandler<TContext>): void {
    this.handlers.set(type, handler);
  }

  handle(type: string, context: TContext, payload: unknown): void {
    const handler = this.handlers.get(type);
    if (!handler) {
      return;
    }

    handler.handle(context, payload);
  }
}
