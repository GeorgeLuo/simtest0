import { MessageHandler } from '../../messaging/inbound/MessageHandler';
import { IOPlayer } from '../IOPlayer';
import { StartOperation } from './StartOperation';
import { PauseOperation } from './PauseOperation';
import { StopOperation } from './StopOperation';

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

export { StartOperation } from './StartOperation';
export { PauseOperation } from './PauseOperation';
export { StopOperation } from './StopOperation';
export { PlaybackOperation, PlaybackResult } from './PlaybackOperation';
