import { Frame } from './Frame';

/**
 * Predicate used to determine whether a subscriber should receive a frame.
 */
export type FrameFilter<TFrame extends Frame = Frame> = (frame: TFrame) => boolean;

/**
 * Filter that always matches, useful for catch-all handlers.
 */
export const matchAll: FrameFilter = () => true;

/**
 * Creates a filter that matches a single message type.
 */
export const matchType = <TFrame extends Frame = Frame>(type: string): FrameFilter<TFrame> => (
  frame,
) => frame.type === type;

/**
 * Creates a filter that matches any message type in the provided list.
 */
export const matchAnyType = <TFrame extends Frame = Frame>(
  ...types: string[]
): FrameFilter<TFrame> => {
  const knownTypes = new Set(types);

  return (frame) => knownTypes.has(frame.type);
};

/**
 * Creates a filter that matches on a metadata field equality check.
 */
export const matchMetadata = <TFrame extends Frame = Frame>(
  key: keyof TFrame['metadata'],
  value: unknown,
): FrameFilter<TFrame> => (frame) => frame.metadata?.[key as string] === value;
