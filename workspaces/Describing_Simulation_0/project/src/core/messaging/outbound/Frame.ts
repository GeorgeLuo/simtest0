/**
 * Canonical description of an outbound message within the simulation runtime.
 *
 * Frames are intentionally small data objects. They can be serialized to travel
 * across processes yet remain ergonomic for synchronous in-memory dispatching.
 * Future systems can refine {@link Frame#payload} and {@link Frame#metadata} via
 * declaration merging or generics to encode richer domain information.
 */
export interface Frame<
  TPayload = unknown,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Well known message type identifier. */
  readonly type: string;
  /** Arbitrary data specific to the message type. */
  readonly payload: TPayload;
  /** Optional additional context that accompanies the payload. */
  readonly metadata: TMetadata;
}

/**
 * Helper to create a frame with sensible defaults for optional metadata.
 */
export function createFrame<
  TPayload,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  type: string,
  payload: TPayload,
  metadata?: Partial<TMetadata>,
): Frame<TPayload, TMetadata> {
  return {
    type,
    payload,
    metadata: ({ ...(metadata ?? {}) } as TMetadata),
  };
}
