import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
export declare class StopOperation implements Operation {
    execute(player: IOPlayer, _message: InboundMessage): void;
}
export declare const STOP_OPERATION_MESSAGE = "simulation.stop";
