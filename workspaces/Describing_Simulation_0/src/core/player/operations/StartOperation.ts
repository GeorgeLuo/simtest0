import { PlaybackOperation } from './PlaybackOperation.js';
import { OperationContext } from '../../messaging/inbound/Operation.js';
import { PlaybackResult } from './PlaybackOperation.js';

export class StartOperation extends PlaybackOperation {
  constructor() {
    super('start');
  }

  override async execute(context: OperationContext<void>): Promise<PlaybackResult> {
    context.player.start();
    return { state: context.player.currentState };
  }
}
