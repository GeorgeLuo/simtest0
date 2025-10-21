import { IOPlayer } from "../../IOPlayer.js";
import { Acknowledgement } from "../outbound/Acknowledgement.js";
import { InboundMessage } from "./InboundMessage.js";
import { Operation } from "./Operation.js";
export declare class MessageHandler<TPayload = unknown> {
    private readonly operations;
    constructor(operations: Operation<TPayload>[]);
    handle(player: IOPlayer, message: InboundMessage<TPayload>): Promise<Acknowledgement>;
}
