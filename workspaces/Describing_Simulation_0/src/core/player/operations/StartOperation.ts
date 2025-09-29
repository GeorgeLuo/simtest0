import { PlaybackOperation } from './PlaybackOperation';
import { OperationContext } from '../../messaging/inbound/Operation';
import { PlaybackResult } from './PlaybackOperation';

export class StartOperation extends PlaybackOperation {
  constructor() {
    super('start');
  }

  override async execute(context: OperationContext<void>): Promise<PlaybackResult> {
    context.player.start();
    return { state: context.player.currentState };
  }
}
