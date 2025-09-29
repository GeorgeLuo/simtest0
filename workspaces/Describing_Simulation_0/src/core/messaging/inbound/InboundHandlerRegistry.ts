import { Acknowledgement } from '../outbound/Acknowledgement';
import { HandlerInvocation, MessageHandler } from './MessageHandler';

/**
 * Maintains mappings between inbound message types and their handlers.
 */
export class InboundHandlerRegistry {
  private readonly handlers = new Map<string, MessageHandler>();

  register(handler: MessageHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Handler for type ${handler.type} already registered`);
    }

    this.handlers.set(handler.type, handler);
  }

  unregister(type: string): void {
    this.handlers.delete(type);
  }

  get(type: string): MessageHandler | undefined {
    return this.handlers.get(type);
  }

  async dispatch(invocation: HandlerInvocation): Promise<Acknowledgement> {
    const handler = this.handlers.get(invocation.message.type);
    if (!handler) {
      return Acknowledgement.error(
        invocation.message.id,
        `No handler registered for type ${invocation.message.type}`
      );
    }

    return handler.handle(invocation);
  }
}
