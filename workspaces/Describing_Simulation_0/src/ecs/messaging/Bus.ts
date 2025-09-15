export type BusSubscriber<TMessage> = (message: TMessage) => void;

/**
 * Simple event bus abstraction for inbound and outbound communication.
 */
export abstract class Bus<TMessage> {
  public abstract subscribe(handler: BusSubscriber<TMessage>): void;

  public abstract unsubscribe(handler: BusSubscriber<TMessage>): void;

  public abstract publish(message: TMessage): void;
}

/**
 * In-memory implementation of the {@link Bus} abstraction. Subscribers are
 * invoked synchronously in the order they were registered.
 */
export class InMemoryBus<TMessage> extends Bus<TMessage> {
  private readonly subscribers = new Set<BusSubscriber<TMessage>>();

  public subscribe(handler: BusSubscriber<TMessage>): void {
    this.subscribers.add(handler);
  }

  public unsubscribe(handler: BusSubscriber<TMessage>): void {
    this.subscribers.delete(handler);
  }

  public publish(message: TMessage): void {
    for (const subscriber of Array.from(this.subscribers)) {
      subscriber(message);
    }
  }
}
