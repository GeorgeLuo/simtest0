import type { IOPlayer } from '../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface PausePayload {
  messageId: string;
}

export class PauseOperation {
  execute(player: IOPlayer, payload: PausePayload): Acknowledgement {
    player.pause();
    return { messageId: payload.messageId, status: 'success' };
  }
}
