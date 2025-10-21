import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { SIMULATION_START_MESSAGE } from "../messages.js";

export class StartOperation implements Operation {
  execute(player: IOPlayer, _message: InboundMessage): void {
    player.start();
  }
}

export const START_OPERATION_MESSAGE = SIMULATION_START_MESSAGE;
