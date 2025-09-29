import { MessageHandler } from '../../../messaging/inbound/MessageHandler';
import { EvaluationPlayer } from '../EvaluationPlayer';
import { InjectFrameOperation } from './InjectFrameOperation';

export function createEvaluationHandlers(player: EvaluationPlayer): void {
  const injectHandler = new MessageHandler('inject-frame', [new InjectFrameOperation()]);

  try {
    player.registry.register(injectHandler);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('already registered')) {
      throw error;
    }
  }
}

export { InjectFrameOperation, type InjectFrameResult } from './InjectFrameOperation';
