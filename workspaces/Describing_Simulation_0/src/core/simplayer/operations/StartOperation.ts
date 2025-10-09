import type { IOPlayer } from '../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface StartPayload {
  messageId: string;
}

export class StartOperation {
  execute(player: IOPlayer, payload: StartPayload): Acknowledgement {
    player.start();
    return { messageId: payload.messageId, status: 'success' };
  }
}
