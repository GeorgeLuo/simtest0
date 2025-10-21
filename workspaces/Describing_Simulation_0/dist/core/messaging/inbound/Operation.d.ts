import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "./InboundMessage.js";
export interface Operation<TPayload = unknown> {
    execute(player: IOPlayer, message: InboundMessage<TPayload>): void | Promise<void>;
}
