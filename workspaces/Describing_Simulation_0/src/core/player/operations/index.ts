import { MessageHandler } from '../../messaging/inbound/MessageHandler.js';
import { IOPlayer } from '../IOPlayer.js';
import { StartOperation } from './StartOperation.js';
import { PauseOperation } from './PauseOperation.js';
import { StopOperation } from './StopOperation.js';

export function createPlaybackHandlers(player: IOPlayer): void {
  const handlers = [
    new MessageHandler('start', [new StartOperation()]),
    new MessageHandler('pause', [new PauseOperation()]),
    new MessageHandler('stop', [new StopOperation()])
  ];

  for (const handler of handlers) {
    try {
      player.registry.register(handler);
    } catch (error) {
      // Allow idempotent registration; ignore duplicates.
      if (!(error instanceof Error) || !error.message.includes('already registered')) {
        throw error;
      }
    }
  }
}

export { StartOperation } from './StartOperation.js';
export { PauseOperation } from './PauseOperation.js';
export { StopOperation } from './StopOperation.js';
export { PlaybackOperation, PlaybackResult } from './PlaybackOperation.js';
