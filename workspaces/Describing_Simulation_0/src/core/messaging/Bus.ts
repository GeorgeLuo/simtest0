// Skeleton for message bus. Implementation to be provided in Stage 4.
export type BusCallback<TMessage> = (message: TMessage) => void;

export class Bus<TMessage> {
  private readonly subscribers = new Set<BusCallback<TMessage>>();

  subscribe(callback: BusCallback<TMessage>): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  publish(message: TMessage): void {
    for (const subscriber of [...this.subscribers]) {
      subscriber(message);
    }
  }
}
