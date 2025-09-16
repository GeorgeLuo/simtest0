// A lightweight publish/subscribe bus used to exchange messages between the
// simulation player and external callers.
export type BusSubscription = () => void;

export type BusSubscriber<TMessage> = (
  message: TMessage,
) => void | Promise<void>;

export class Bus<TMessage> {
  private readonly subscribers = new Set<BusSubscriber<TMessage>>();

  subscribe(callback: BusSubscriber<TMessage>): BusSubscription {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async publish(message: TMessage): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.subscribers).map(async (subscriber) => subscriber(message)),
    );

    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      const message = errors
        .map((error) => (error instanceof Error ? error.message : String(error)))
        .join('; ');
      throw new Error(`Multiple bus subscribers failed: ${message}`);
    }
  }
}
