import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';

export interface StopPayload {
  messageId: string;
}

export class Stop implements Operation<IOPlayer, StopPayload> {
  execute(player: IOPlayer, payload: StopPayload): Acknowledgement {
    player.stop();
    return { messageId: payload.messageId, status: 'success' };
  }
}
