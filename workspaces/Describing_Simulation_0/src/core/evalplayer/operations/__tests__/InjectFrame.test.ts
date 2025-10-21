import { describe, expect, it, vi } from "vitest";
import { InboundMessage } from "../../../messaging/inbound/InboundMessage.js";
import { MessageHandler } from "../../../messaging/inbound/MessageHandler.js";
import { Frame } from "../../../messaging/outbound/Frame.js";
import {
  InjectFrameOperation,
  INJECT_FRAME_MESSAGE,
  InjectFramePayload,
} from "../InjectFrame.js";
import { IOPlayer } from "../../../IOPlayer.js";

const createFrame = (): Frame => ({
  tick: 42,
  entities: [],
});

const createMessage = (): InboundMessage<InjectFramePayload> => ({
  id: "inject-1",
  type: INJECT_FRAME_MESSAGE,
  payload: {
    frame: createFrame(),
  },
});

describe("InjectFrameOperation", () => {
  it("delegates to evaluation player ingestFrame with the payload frame", async () => {
    const ingestFrame = vi.fn();
    const playerStub = { ingestFrame } as unknown as IOPlayer;
    const operation = new InjectFrameOperation();
    const message = createMessage();

    await operation.execute(playerStub, message);

    expect(ingestFrame).toHaveBeenCalledTimes(1);
    expect(ingestFrame).toHaveBeenCalledWith(message.payload.frame);
  });

  it("yields success acknowledgement through a MessageHandler", async () => {
    const playerStub = {
      ingestFrame: vi.fn(),
    } as unknown as IOPlayer;
    const handler = new MessageHandler([new InjectFrameOperation()]);
    const message = createMessage();

    const acknowledgement = await handler.handle(playerStub, message);

    expect(acknowledgement.status).toBe("success");
    expect(acknowledgement.messageId).toBe(message.id);
  });
});
