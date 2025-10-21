import { MessageHandler } from "./MessageHandler.js";

export class InboundHandlerRegistry {
  private readonly handlers = new Map<string, MessageHandler>();

  register(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  get(type: string): MessageHandler | undefined {
    return this.handlers.get(type);
  }
}
