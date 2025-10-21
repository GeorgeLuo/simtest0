import { IOPlayer } from "../../IOPlayer.js";
import { Acknowledgement, errorAck, successAck } from "../outbound/Acknowledgement.js";
import { InboundMessage } from "./InboundMessage.js";
import { Operation } from "./Operation.js";

export class MessageHandler<TPayload = unknown> {
  constructor(private readonly operations: Operation<TPayload>[]) {}

  async handle(
    player: IOPlayer,
    message: InboundMessage<TPayload>,
  ): Promise<Acknowledgement> {
    try {
      for (const operation of this.operations) {
        await operation.execute(player, message);
      }
      return successAck(message.id);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown handler error";
      return errorAck(message.id, reason);
    }
  }
}
