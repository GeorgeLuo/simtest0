import type { IOPlayer } from '../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface StopPayload {
  messageId: string;
}

export class StopOperation {
  execute(player: IOPlayer, payload: StopPayload): Acknowledgement {
    player.stop();
    return { messageId: payload.messageId, status: 'success' };
  }
}
