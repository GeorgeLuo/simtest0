/**
 * Represents the result of delivering a message frame to one or more subscribers.
 *
 * The acknowledgement structure intentionally keeps the surface area small so that
 * future systems (e.g. remote transports) can extend it with additional delivery
 * metadata without breaking the synchronous bus helpers defined in this module.
 */
export interface Acknowledgement {
  /** Number of handlers that received the frame. */
  readonly deliveries: number;
  /** Convenience flag indicating whether at least one handler consumed the frame. */
  readonly acknowledged: boolean;
}

/**
 * Creates a successful acknowledgement for a given number of deliveries.
 *
 * @param deliveries - Count of handlers that processed the frame (defaults to one).
 */
export function acknowledge(deliveries: number = 1): Acknowledgement {
  if (deliveries < 0) {
    throw new Error('Acknowledgement deliveries cannot be negative.');
  }

  return {
    deliveries,
    acknowledged: deliveries > 0,
  };
}

/**
 * Creates a negative acknowledgement indicating that no handler consumed the frame.
 */
export function noAcknowledgement(): Acknowledgement {
  return acknowledge(0);
}

/**
 * Normalizes optional acknowledgement return values from handlers.
 */
export function normalizeAcknowledgement(
  acknowledgement?: Acknowledgement | void,
): Acknowledgement {
  if (!acknowledgement) {
    return acknowledge();
  }

  return acknowledgement;
}

/**
 * Reduces a list of acknowledgements into a single aggregate acknowledgement.
 *
 * This helper is used by the bus and registry utilities to report whether a frame
 * was consumed by any handler while preserving the total delivery count.
 */
export function combineAcknowledgements(
  acknowledgements: Iterable<Acknowledgement>,
): Acknowledgement {
  let deliveries = 0;

  for (const acknowledgement of acknowledgements) {
    deliveries += acknowledgement.deliveries;
  }

  return acknowledge(deliveries);
}
