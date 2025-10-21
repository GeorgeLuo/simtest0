import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { Frame } from "../../messaging/outbound/Frame.js";
export interface InjectFramePayload {
    readonly frame: Frame;
}
export declare class InjectFrameOperation implements Operation<InjectFramePayload> {
    execute(player: IOPlayer, message: InboundMessage<InjectFramePayload>): void | Promise<void>;
}
export declare const INJECT_FRAME_MESSAGE = "evaluation.frame";
