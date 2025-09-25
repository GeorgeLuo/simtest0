import { Frame } from './Frame';

/**
 * Filters frame data prior to publication on the outbound bus.
 */
export function filterFrame(frame: Frame): Frame {
  return frame;
}
