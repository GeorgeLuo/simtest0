import type { Operation } from '../../messaging/inbound/Operation';
import { matchType } from '../../messaging/outbound/FrameFilter';
import { acknowledge } from '../../messaging/outbound/Acknowledgement';
import type { Player } from '../../Player';

export interface StopOperationOptions {
  readonly messageType?: string;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/stop';
const OPERATION_ID = 'simulation.stop';

export function createStopOperation(
  player: Pick<Player, 'stop'>,
  options: StopOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: () => {
      player.stop();
      return acknowledge();
    },
  };
}
