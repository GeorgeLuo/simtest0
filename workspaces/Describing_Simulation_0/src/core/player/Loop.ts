export interface LoopHandle {
  stop(): void;
}

export class IntervalLoop implements LoopHandle {
  #timer: ReturnType<typeof setInterval> | null = null;

  constructor(callback: () => void, intervalMs = 0) {
    this.#timer = setInterval(callback, intervalMs);
  }

  stop(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
  }
}
