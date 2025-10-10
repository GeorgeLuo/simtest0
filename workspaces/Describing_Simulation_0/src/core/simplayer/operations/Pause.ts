import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';

export interface PausePayload {
  messageId: string;
}

export class Pause implements Operation<IOPlayer, PausePayload> {
  execute(player: IOPlayer, payload: PausePayload): Acknowledgement {
    player.pause();
    return { messageId: payload.messageId, status: 'success' };
  }
}
