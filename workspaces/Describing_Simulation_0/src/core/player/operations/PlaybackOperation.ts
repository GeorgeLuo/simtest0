import { Operation } from '../../messaging/inbound/Operation';
import { PlayerState } from '../Player';

export interface PlaybackResult {
  state: PlayerState;
}

export abstract class PlaybackOperation extends Operation<void, PlaybackResult> {
  protected constructor(id: string) {
    super(id);
  }
}
