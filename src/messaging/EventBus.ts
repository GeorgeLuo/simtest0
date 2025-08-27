export type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<any>>>();

  subscribe<T>(type: string, handler: Handler<T>): void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<any>);
  }

  unsubscribe<T>(type: string, handler: Handler<T>): void {
    this.handlers.get(type)?.delete(handler as Handler<any>);
  }

  publish<T>(type: string, payload: T): void {
    this.handlers.get(type)?.forEach(h => h(payload));
  }
}

export default EventBus;
