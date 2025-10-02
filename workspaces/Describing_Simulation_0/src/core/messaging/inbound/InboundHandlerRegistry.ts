import type { MessageHandler } from "./MessageHandler";

export class InboundHandlerRegistry<TKey extends string | number | symbol, TContext, TMessage, TResponse> {
  constructor(private readonly handlers = new Map<TKey, MessageHandler<TContext, TMessage, TResponse>>()) {}

  register(key: TKey, handler: MessageHandler<TContext, TMessage, TResponse>): void {
    this.handlers.set(key, handler);
  }

  get(key: TKey): MessageHandler<TContext, TMessage, TResponse> | undefined {
    return this.handlers.get(key);
  }
}
