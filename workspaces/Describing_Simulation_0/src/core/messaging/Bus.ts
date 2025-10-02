export type BusListener<T> = (message: T) => void;

export class Bus<T> {
  #listeners = new Set<BusListener<T>>();

  subscribe(listener: BusListener<T>): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  send(message: T): void {
    for (const listener of [...this.#listeners]) {
      listener(message);
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
