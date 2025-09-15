import { Message, MessageHandler } from "../../MessageHandler";

/**
 * Registry mapping inbound message types to their handlers.
 */
export abstract class InboundHandlerRegistry<TMessage extends Message = Message> {
  public abstract register(handler: MessageHandler<TMessage>): void;

  public abstract unregister(type: TMessage["type"]): void;

  public abstract resolve(type: TMessage["type"]): MessageHandler<TMessage> | undefined;

  public abstract list(): Iterable<MessageHandler<TMessage>>;
}
