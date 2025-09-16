import type { Player } from '../../../../Player.js';
import type {
  Message,
  MessageHandler,
} from '../../../MessageHandler.js';

export type PauseMessage = Message<'pause', Record<string, never>>;

export class PauseHandler implements MessageHandler<PauseMessage, Player> {
  readonly type = 'pause';

  async handle(_message: PauseMessage, player: Player): Promise<void> {
    await player.pause();
  }
}
