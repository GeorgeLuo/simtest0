import { PlaybackOperation, PlaybackResult } from './PlaybackOperation';
import { OperationContext } from '../../messaging/inbound/Operation';

export class StopOperation extends PlaybackOperation {
  constructor() {
    super('stop');
  }

  override async execute(context: OperationContext<void>): Promise<PlaybackResult> {
    context.player.stop();
    return { state: context.player.currentState };
  }
}
