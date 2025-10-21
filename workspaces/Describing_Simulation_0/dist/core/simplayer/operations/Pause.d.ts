import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
export declare class PauseOperation implements Operation {
    execute(player: IOPlayer, _message: InboundMessage): void;
}
export declare const PAUSE_OPERATION_MESSAGE = "simulation.pause";
