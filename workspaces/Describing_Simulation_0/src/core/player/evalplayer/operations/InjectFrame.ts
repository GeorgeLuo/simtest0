import type { Operation } from "../../../messaging/inbound/Operation";
import type { CommandMessage } from "../../IOPlayer";
import type { EvaluationPlayer } from "../EvaluationPlayer";
import type { Frame } from "../../../messaging/outbound/Frame";

interface InjectFramePayload {
  frame: Frame;
}

export function createInjectFrameOperation(): Operation<EvaluationPlayer, CommandMessage> {
  return {
    execute(player, message) {
      if (message.type !== "inject-frame") {
        return;
      }

      const payload = message.payload as InjectFramePayload | undefined;
      if (!payload?.frame) {
        throw new Error("Missing frame payload for inject-frame command");
      }

      player.loadFrame(payload.frame);
    },
  };
}
