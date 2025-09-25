import { Operation, OperationPayload } from './Operation';
import { Player } from '../../Player';
import { Acknowledgement } from '../outbound/Acknowledgement';

/** Executes a sequence of operations for a message. */
export class MessageHandler {
  constructor(private readonly operations: Operation[]) {}

  handle(player: Player, payload: OperationPayload): Acknowledgement {
    let acknowledgement: Acknowledgement = { status: 'ok' };
    for (const operation of this.operations) {
      acknowledgement = operation(player, payload);
    }
    return acknowledgement;
  }
}
