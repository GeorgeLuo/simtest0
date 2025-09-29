import { PlaybackOperation, PlaybackResult } from './PlaybackOperation';
import { OperationContext } from '../../messaging/inbound/Operation';

export class PauseOperation extends PlaybackOperation {
  constructor() {
    super('pause');
  }

  override async execute(context: OperationContext<void>): Promise<PlaybackResult> {
    context.player.pause();
    return { state: context.player.currentState };
  }
}
