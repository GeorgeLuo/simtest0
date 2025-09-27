import type { Operation } from '../../messaging/inbound/Operation';
import { matchType } from '../../messaging/outbound/FrameFilter';
import { acknowledge, noAcknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Frame } from '../../messaging/outbound/Frame';
import type { System } from '../../systems/System';
import type { SystemManager } from '../../systems/SystemManager';

export interface EjectSystemPayload {
  readonly system: System;
}

export type EjectSystemFrame = Frame<EjectSystemPayload>;

export interface EjectSystemOperationOptions {
  readonly messageType?: string;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/system.eject';
const OPERATION_ID = 'simulation.eject-system';

export function createEjectSystemOperation(
  systems: Pick<SystemManager, 'remove'>,
  options: EjectSystemOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: (frame) => {
      const { system } = (frame as EjectSystemFrame).payload;
      const removed = systems.remove(system);

      if (!removed) {
        return noAcknowledgement();
      }

      return acknowledge();
    },
  };
}
