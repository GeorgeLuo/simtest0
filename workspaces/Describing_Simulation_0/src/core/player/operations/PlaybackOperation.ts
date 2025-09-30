import { Operation } from '../../messaging/inbound/Operation.js';
import { PlayerState } from '../Player.js';

export interface PlaybackResult {
  state: PlayerState;
}

export abstract class PlaybackOperation extends Operation<void, PlaybackResult> {
  protected constructor(id: string) {
    super(id);
  }
}
