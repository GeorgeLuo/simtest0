import type { Operation } from '../../messaging/inbound/Operation';
import { matchType } from '../../messaging/outbound/FrameFilter';
import { acknowledge } from '../../messaging/outbound/Acknowledgement';
import type { Frame } from '../../messaging/outbound/Frame';
import type { System } from '../../systems/System';
import type { SystemManager } from '../../systems/SystemManager';

export interface InjectSystemPayload {
  readonly system: System;
  readonly priority?: number;
}

export type InjectSystemFrame = Frame<InjectSystemPayload>;

export interface InjectSystemOperationOptions {
  readonly messageType?: string;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/system.inject';
const OPERATION_ID = 'simulation.inject-system';

export function createInjectSystemOperation(
  systems: Pick<SystemManager, 'register'>,
  options: InjectSystemOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: (frame) => {
      const { system, priority } = (frame as InjectSystemFrame).payload;

      if (typeof priority === 'number') {
        systems.register(system, priority);
      } else {
        systems.register(system);
      }

      return acknowledge();
    },
  };
}
