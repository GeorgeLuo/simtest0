export type BusSubscriber<TMessage> = (message: TMessage) => void;

/**
 * Simple event bus abstraction for inbound and outbound communication.
 */
export abstract class Bus<TMessage> {
  public abstract subscribe(handler: BusSubscriber<TMessage>): void;

  public abstract unsubscribe(handler: BusSubscriber<TMessage>): void;

  public abstract publish(message: TMessage): void;
}
