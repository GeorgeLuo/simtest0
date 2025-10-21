import { describe, expect, it, vi } from "vitest";
import { IOPlayer } from "../../../IOPlayer.js";
import { InboundMessage } from "../../../messaging/inbound/InboundMessage.js";
import { MessageHandler } from "../../../messaging/inbound/MessageHandler.js";
import { PauseOperation, PAUSE_OPERATION_MESSAGE } from "../Pause.js";

const createMessage = (): InboundMessage<undefined> => ({
  id: "msg-pause",
  type: PAUSE_OPERATION_MESSAGE,
  payload: undefined,
});

describe("PauseOperation", () => {
  it("delegates to player.pause()", async () => {
    const pauseSpy = vi.fn();
    const playerStub = {
      start: vi.fn(),
      pause: pauseSpy,
      stop: vi.fn(),
    } as unknown as IOPlayer;

    const operation = new PauseOperation();

    await operation.execute(playerStub, createMessage());

    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it("produces success acknowledgement under MessageHandler", async () => {
    const playerStub = {
      start: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
    } as unknown as IOPlayer;
    const handler = new MessageHandler([new PauseOperation()]);
    const message = createMessage();

    const acknowledgement = await handler.handle(playerStub, message);

    expect(acknowledgement.status).toBe("success");
    expect(acknowledgement.messageId).toBe(message.id);
  });
});
