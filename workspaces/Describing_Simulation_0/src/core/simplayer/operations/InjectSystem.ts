import type { IOPlayer } from '../../IOPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Operation } from '../../messaging/inbound/Operation';
import type { System } from '../../systems/System';

export interface InjectSystemPayload {
  messageId: string;
  system: System;
}

export class InjectSystem implements Operation<IOPlayer, InjectSystemPayload> {
  execute(player: IOPlayer, payload: InjectSystemPayload): Acknowledgement {
    if (!payload?.system) {
      throw new Error('System payload is required for injection');
    }

    const systemId = player.injectSystem({ system: payload.system });
    return { messageId: payload.messageId, status: 'success', systemId };
  }
}
