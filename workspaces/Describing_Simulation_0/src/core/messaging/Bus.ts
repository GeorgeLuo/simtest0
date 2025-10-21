export type BusCallback<T> = (payload: T) => void;

export class Bus<T> {
  private readonly listeners = new Map<number, BusCallback<T>>();
  private readonly snapshot: BusCallback<T>[] = [];
  private nextId = 1;

  subscribe(callback: BusCallback<T>): () => void {
    const token = this.nextId++;
    this.listeners.set(token, callback);
    return () => {
      this.listeners.delete(token);
    };
  }

  publish(payload: T): void {
    if (this.listeners.size === 0) {
      return;
    }

    this.snapshot.length = 0;
    for (const callback of this.listeners.values()) {
      this.snapshot.push(callback);
    }

    for (let index = 0; index < this.snapshot.length; index += 1) {
      this.snapshot[index](payload);
    }
  }
}
