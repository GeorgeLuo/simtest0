// Message bus providing publish/subscribe semantics for intra-player communication.
export type BusCallback<TMessage> = (message: TMessage) => void;

type Subscription<TMessage> = {
  callback: BusCallback<TMessage>;
  active: boolean;
};

export class Bus<TMessage> {
  private readonly subscribers: Array<Subscription<TMessage>> = [];
  private dispatchDepth = 0;

  subscribe(callback: BusCallback<TMessage>): () => void {
    const subscription: Subscription<TMessage> = { callback, active: true };
    this.subscribers.push(subscription);

    return () => {
      if (!subscription.active) {
        return;
      }
      subscription.active = false;
      if (this.dispatchDepth === 0) {
        this.compact();
      }
    };
  }

  publish(message: TMessage): void {
    this.dispatchDepth += 1;
    const snapshotLength = this.subscribers.length;

    try {
      for (let index = 0; index < snapshotLength; index += 1) {
        const subscription = this.subscribers[index];
        if (subscription?.active) {
          subscription.callback(message);
        }
      }
    } finally {
      this.dispatchDepth -= 1;
      if (this.dispatchDepth === 0) {
        this.compact();
      }
    }
  }

  private compact(): void {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < this.subscribers.length; readIndex += 1) {
      const subscription = this.subscribers[readIndex];
      if (subscription?.active) {
        if (writeIndex !== readIndex) {
          this.subscribers[writeIndex] = subscription;
        }
        writeIndex += 1;
      }
    }
    this.subscribers.length = writeIndex;
  }
}
