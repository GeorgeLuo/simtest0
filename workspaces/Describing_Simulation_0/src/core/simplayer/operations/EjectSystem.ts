import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';
import type { System } from '../../systems/System';

export interface EjectSystemPayload {
  messageId: string;
  system?: System;
  systemId?: string;
}

export class EjectSystem implements Operation<IOPlayer, EjectSystemPayload> {
  execute(player: IOPlayer, payload: EjectSystemPayload): Acknowledgement {
    const removed = player.ejectSystem({ system: payload.system, systemId: payload.systemId });
    if (!removed) {
      return {
        messageId: payload.messageId,
        status: 'error',
        detail: 'System not found',
      };
    }

    return { messageId: payload.messageId, status: 'success' };
  }
}
