import type {
  EntityBlueprint,
  Player,
} from '../../Player.js';
import type {
  Message,
  MessageHandler,
} from '../MessageHandler.js';

export type InjectEntityMessage = Message<'inject-entity', EntityBlueprint>;

export class InjectEntityHandler
  implements MessageHandler<InjectEntityMessage, Player>
{
  readonly type = 'inject-entity';

  async handle(message: InjectEntityMessage, player: Player): Promise<void> {
    await player.injectEntity(message.payload);
  }
}
