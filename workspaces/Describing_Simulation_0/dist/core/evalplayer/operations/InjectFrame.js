import { EVALUATION_FRAME_MESSAGE } from "../messages.js";
export class InjectFrameOperation {
    execute(player, message) {
        if (!message.payload?.frame) {
            throw new Error("Frame payload is required");
        }
        const evaluationPlayer = player;
        evaluationPlayer.ingestFrame(message.payload.frame);
    }
}
export const INJECT_FRAME_MESSAGE = EVALUATION_FRAME_MESSAGE;
