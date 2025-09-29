export type BusHandler<T> = (payload: T) => void;

/**
 * Simple publish/subscribe bus delivering payloads to registered handlers.
 */
export class Bus<T> {
  private readonly handlers = new Map<number, BusHandler<T>>();
  private nextId = 0;

  subscribe(handler: BusHandler<T>): () => void {
    const id = this.nextId++;
    this.handlers.set(id, handler);

    let unsubscribed = false;
    return () => {
      if (unsubscribed) {
        return;
      }
      unsubscribed = true;
      this.handlers.delete(id);
    };
  }

  publish(payload: T): void {
    for (const handler of this.handlers.values()) {
      handler(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
