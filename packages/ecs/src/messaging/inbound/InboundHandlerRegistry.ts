import type { MessageHandler } from './MessageHandler';
import type { Acknowledgement } from '../outbound/Acknowledgement';

export class InboundHandlerRegistry<TContext = unknown> {
  private readonly handlers: Map<string, MessageHandler<TContext, unknown>>;

  constructor(handlers: Map<string, MessageHandler<TContext, unknown>> = new Map()) {
    this.handlers = new Map(handlers);
  }

  register<TPayload>(
    type: string,
    handler: MessageHandler<TContext, TPayload>,
  ): void {
    this.handlers.set(type, handler as unknown as MessageHandler<TContext, unknown>);
  }

  handle(type: string, context: TContext, payload: unknown): Acknowledgement | null {
    const handler = this.handlers.get(type);
    if (!handler) {
      return null;
    }

    return handler.handle(context, payload);
  }
}
