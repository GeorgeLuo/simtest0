import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';

export interface StartPayload {
  messageId: string;
}

export class Start implements Operation<IOPlayer, StartPayload> {
  execute(player: IOPlayer, payload: StartPayload): Acknowledgement {
    player.start();
    return { messageId: payload.messageId, status: 'success' };
  }
}
