import type { Bus } from '../Bus';
import type { Operation } from './Operation';
import {
  combineAcknowledgements,
  noAcknowledgement,
  normalizeAcknowledgement,
  type Acknowledgement,
} from '../outbound/Acknowledgement';
import type { Frame } from '../outbound/Frame';

/**
 * Registry that coordinates inbound message handlers.
 *
 * The registry mirrors the subscription semantics of {@link Bus} while keeping
 * handler management separate. It enables systems to register declarative
 * operations and let the registry handle dispatch bookkeeping.
 */
export class InboundHandlerRegistry {
  private readonly operations = new Map<string, Operation>();

  /**
   * Registers an operation with the registry.
   *
   * Returns a function that removes the operation when invoked. Duplicate
   * identifiers are rejected to prevent accidental double-registration.
   */
  register(operation: Operation): () => void {
    if (this.operations.has(operation.id)) {
      throw new Error(`Operation with id "${operation.id}" is already registered.`);
    }

    this.operations.set(operation.id, operation);

    return () => {
      this.operations.delete(operation.id);
    };
  }

  /**
   * Dispatches the provided frame to all matching operations.
   */
  dispatch(frame: Frame, bus: Bus): Acknowledgement {
    const acknowledgements: Acknowledgement[] = [];

    for (const operation of this.operations.values()) {
      if (operation.filter(frame as never)) {
        acknowledgements.push(
          normalizeAcknowledgement(operation.handle(frame as never, bus)),
        );
      }
    }

    if (acknowledgements.length === 0) {
      return noAcknowledgement();
    }

    return combineAcknowledgements(acknowledgements);
  }
}
