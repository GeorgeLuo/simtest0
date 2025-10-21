import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { SIMULATION_PAUSE_MESSAGE } from "../messages.js";

export class PauseOperation implements Operation {
  execute(player: IOPlayer, _message: InboundMessage): void {
    player.pause();
  }
}

export const PAUSE_OPERATION_MESSAGE = SIMULATION_PAUSE_MESSAGE;
