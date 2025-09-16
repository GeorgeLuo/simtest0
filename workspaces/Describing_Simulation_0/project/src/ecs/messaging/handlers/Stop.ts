import type { Player } from '../../Player.js';
import type {
  Message,
  MessageHandler,
} from '../MessageHandler.js';

export type StopMessage = Message<'stop', Record<string, never>>;

export class StopHandler implements MessageHandler<StopMessage, Player> {
  readonly type = 'stop';

  async handle(_message: StopMessage, player: Player): Promise<void> {
    await player.stop();
  }
}
