import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';
import type { System } from '../../systems/System';

export interface EjectSystemPayload {
  messageId: string;
  system: System;
}

export class EjectSystem implements Operation<IOPlayer, EjectSystemPayload> {
  execute(player: IOPlayer, payload: EjectSystemPayload): Acknowledgement {
    player.ejectSystem({ system: payload.system });
    return { messageId: payload.messageId, status: 'success' };
  }
}
