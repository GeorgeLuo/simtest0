import { FrameFilter } from '../../messaging/Frame';
import { FrameComponentType } from './FrameComponent';
import { IOPlayer, IOPlayerOptions } from '../IOPlayer';

export interface EvaluationPlayerOptions extends IOPlayerOptions {}

/**
 * Player specialized for evaluation workflows. Stores incoming frames as entities and
 * hides historical frame components from outbound publications.
 */
export class EvaluationPlayer extends IOPlayer {
  readonly frameComponent: FrameComponentType;

  constructor(options: EvaluationPlayerOptions = {}) {
    const frameFilter = options.frameFilter ?? new FrameFilter([FrameComponentType.ID]);
    super({ ...options, frameFilter });
    this.frameComponent = new FrameComponentType();
  }

  emitEvaluationFrame(): void {
    this.emitFrame();
  }
}
