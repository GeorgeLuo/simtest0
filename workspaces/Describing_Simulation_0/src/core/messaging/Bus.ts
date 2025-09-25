export interface BusMessage {
  type: string;
  payload?: Record<string, unknown>;
}

type BusSubscriber = (message: BusMessage) => void;

/**
 * Very small event bus abstraction for inbound/outbound messaging.
 */
export class Bus {
  private readonly subscribers: BusSubscriber[] = [];

  subscribe(subscriber: BusSubscriber): void {
    this.subscribers.push(subscriber);
  }

  publish(message: BusMessage): void {
    for (const subscriber of this.subscribers) {
      subscriber(message);
    }
  }
}
