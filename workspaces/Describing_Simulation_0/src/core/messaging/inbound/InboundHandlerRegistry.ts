import { BusMessage } from '../Bus';
import { MessageHandler } from './MessageHandler';
import { Player } from '../../Player';
import { OperationPayload } from './Operation';

/**
 * Registry mapping inbound message types to handler sequences.
 */
export class InboundHandlerRegistry {
  private readonly handlers = new Map<string, MessageHandler>();

  register(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  dispatch(message: BusMessage, player: Player): void {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      return;
    }

    const payload: OperationPayload = message.payload ?? {};
    handler.handle(player, payload);
  }
}
