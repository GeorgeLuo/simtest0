import type { Bus } from '../Bus';
import type { Acknowledgement } from '../outbound/Acknowledgement';
import type { Frame } from '../outbound/Frame';

/**
 * Function signature for processing inbound frames.
 *
 * Handlers can return an {@link Acknowledgement} when they need to influence the
 * aggregate delivery reporting. Omitting the return value implies that the frame
 * was consumed successfully.
 */
export type MessageHandler<TFrame extends Frame = Frame> = (
  frame: TFrame,
  bus: Bus,
) => Acknowledgement | void;
