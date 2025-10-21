import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { SIMULATION_STOP_MESSAGE } from "../messages.js";

export class StopOperation implements Operation {
  execute(player: IOPlayer, _message: InboundMessage): void {
    player.stop();
  }
}

export const STOP_OPERATION_MESSAGE = SIMULATION_STOP_MESSAGE;
