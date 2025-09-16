import type { Player } from '../../../../Player.js';
import type {
  Message,
  MessageHandler,
} from '../../../MessageHandler.js';

export type StartMessage = Message<'start', Record<string, never>>;

export class StartHandler implements MessageHandler<StartMessage, Player> {
  readonly type = 'start';

  async handle(_message: StartMessage, player: Player): Promise<void> {
    await player.start();
  }
}
