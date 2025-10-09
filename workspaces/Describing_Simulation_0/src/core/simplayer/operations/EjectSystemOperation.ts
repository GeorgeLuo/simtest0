import type { IOPlayer } from '../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { System } from '../../systems/System';

export interface EjectSystemPayload {
  messageId: string;
  system: System;
}

export class EjectSystemOperation {
  execute(player: IOPlayer, payload: EjectSystemPayload): Acknowledgement {
    player.ejectSystem({ system: payload.system });
    return { messageId: payload.messageId, status: 'success' };
  }
}
