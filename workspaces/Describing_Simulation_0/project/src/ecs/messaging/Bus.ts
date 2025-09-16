// Provides a lightweight message bus with payload-aware handlers.
import type {
  MessageDisposer,
  MessageHandler,
  MessageTypeMap,
} from './MessageHandler.js';

/**
 * Dispatches typed messages to registered handlers.
 */
export class Bus<TMessages extends MessageTypeMap> {
  private readonly handlers = new Map<
    keyof TMessages,
    Set<MessageHandler<TMessages, keyof TMessages>>
  >();

  /**
   * Registers a handler for a specific message type and returns a disposer to
   * remove it later.
   */
  on<K extends keyof TMessages>(
    type: K,
    handler: MessageHandler<TMessages, K>,
  ): MessageDisposer {
    const registry = this.ensureRegistry(type);
    registry.add(handler as MessageHandler<TMessages, keyof TMessages>);

    return () => {
      this.off(type, handler);
    };
  }

  /**
   * Removes a handler for the provided message type.
   */
  off<K extends keyof TMessages>(
    type: K,
    handler: MessageHandler<TMessages, K>,
  ): boolean {
    const registry = this.handlers.get(type);

    if (!registry) {
      return false;
    }

    const removed = registry.delete(
      handler as MessageHandler<TMessages, keyof TMessages>,
    );

    if (registry.size === 0) {
      this.handlers.delete(type);
    }

    return removed;
  }

  /**
   * Dispatches a message to all handlers registered for the message type.
   */
  dispatch<K extends keyof TMessages>(type: K, payload: TMessages[K]): void {
    const registry = this.handlers.get(type) as
      | Set<MessageHandler<TMessages, K>>
      | undefined;

    if (!registry) {
      return;
    }

    for (const handler of registry) {
      handler(payload);
    }
  }

  /**
   * Clears all registered handlers across every message type.
   */
  clear(): void {
    this.handlers.clear();
  }

  private ensureRegistry<K extends keyof TMessages>(
    type: K,
  ): Set<MessageHandler<TMessages, K>> {
    const existing = this.handlers.get(type) as
      | Set<MessageHandler<TMessages, K>>
      | undefined;

    if (existing) {
      return existing;
    }

    const created = new Set<MessageHandler<TMessages, K>>();
    this.handlers.set(
      type,
      created as Set<MessageHandler<TMessages, keyof TMessages>>,
    );
    return created;
  }
}
