import { Message, MessageHandler } from "../../../MessageHandler";
import { InboundHandlerRegistry } from "../InboundHandlerRegistry";

/**
 * Default registry implementation backed by an in-memory map keyed by the
 * handler's declared message type.
 */
export class DefaultInboundHandlerRegistry<
  TMessage extends Message = Message,
> extends InboundHandlerRegistry<TMessage> {
  private readonly handlers = new Map<
    TMessage["type"],
    MessageHandler<TMessage>
  >();

  public register(handler: MessageHandler<TMessage>): void {
    this.handlers.set(handler.messageType, handler);
  }

  public unregister(type: TMessage["type"]): void {
    this.handlers.delete(type);
  }

  public resolve(type: TMessage["type"]): MessageHandler<TMessage> | undefined {
    return this.handlers.get(type);
  }

  public list(): Iterable<MessageHandler<TMessage>> {
    return this.handlers.values();
  }
}
