import type { Operation } from '../../messaging/inbound/Operation';
import { matchType } from '../../messaging/outbound/FrameFilter';
import { acknowledge } from '../../messaging/outbound/Acknowledgement';
import type { Player } from '../../Player';

export interface StartOperationOptions {
  readonly messageType?: string;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/start';
const OPERATION_ID = 'simulation.start';

export function createStartOperation(
  player: Pick<Player, 'start' | 'resume'>,
  options: StartOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: () => {
      player.start();
      player.resume();
      return acknowledge();
    },
  };
}
