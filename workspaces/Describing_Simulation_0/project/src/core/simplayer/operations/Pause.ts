import type { Operation } from '../../messaging/inbound/Operation';
import { matchType } from '../../messaging/outbound/FrameFilter';
import { acknowledge } from '../../messaging/outbound/Acknowledgement';
import type { Player } from '../../Player';

export interface PauseOperationOptions {
  readonly messageType?: string;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/pause';
const OPERATION_ID = 'simulation.pause';

export function createPauseOperation(
  player: Pick<Player, 'pause'>,
  options: PauseOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: () => {
      player.pause();
      return acknowledge();
    },
  };
}
