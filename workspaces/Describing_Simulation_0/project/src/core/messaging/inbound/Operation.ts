import type { Frame } from '../outbound/Frame';
import type { FrameFilter } from '../outbound/FrameFilter';
import type { MessageHandler } from './MessageHandler';

/**
 * Describes a handler that should be invoked when an inbound frame matches the
 * associated {@link FrameFilter}. Operations can be uniquely identified to make
 * debugging and registry manipulation easier.
 */
export interface Operation<TFrame extends Frame = Frame> {
  /** Debug-friendly identifier for the handler. */
  readonly id: string;
  /** Predicate used to determine whether the handler should receive the frame. */
  readonly filter: FrameFilter<TFrame>;
  /** Function that processes the frame when the filter matches. */
  readonly handle: MessageHandler<TFrame>;
}
