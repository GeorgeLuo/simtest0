import { Frame } from '../messaging/Frame.js';
import { Player, PlayerOptions } from './Player.js';

/**
 * Player variant that exposes manual stepping utilities for deterministic simulations.
 */
export class ManualPlayer extends Player {
  constructor(options: PlayerOptions = {}) {
    super(options);
  }

  /**
   * Advances the simulation by a single tick and publishes the resulting frame.
   */
  step(): void {
    this.runTick();
  }

  /**
   * Emits a snapshot of the current simulation state without advancing time.
   */
  snapshot(): void {
    this.emitFrame();
  }

  /**
   * Collects a single frame and returns it to the caller.
   */
  captureFrame(): Frame {
    let captured: Frame | null = null;
    const unsubscribe = this.outboundBus.subscribe((frame) => {
      captured = frame;
    });
    this.emitFrame();
    unsubscribe();
    if (!captured) {
      throw new Error('Failed to capture frame');
    }
    return captured;
  }
}
