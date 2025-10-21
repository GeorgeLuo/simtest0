import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import { Frame } from "../../messaging/outbound/Frame.js";
import type { EvaluationPlayer } from "../EvaluationPlayer.js";
import { EVALUATION_FRAME_MESSAGE } from "../messages.js";

export interface InjectFramePayload {
  readonly frame: Frame;
}

export class InjectFrameOperation implements Operation<InjectFramePayload> {
  execute(
    player: IOPlayer,
    message: InboundMessage<InjectFramePayload>,
  ): void | Promise<void> {
    if (!message.payload?.frame) {
      throw new Error("Frame payload is required");
    }

    const evaluationPlayer = player as EvaluationPlayer;
    evaluationPlayer.ingestFrame(message.payload.frame);
  }
}

export const INJECT_FRAME_MESSAGE = EVALUATION_FRAME_MESSAGE;
