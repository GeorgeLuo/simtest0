import { describe, expect, it, vi } from "vitest";
import { MessageHandler } from "../../../messaging/inbound/MessageHandler.js";
import { InjectFrameOperation, INJECT_FRAME_MESSAGE, } from "../InjectFrame.js";
const createFrame = () => ({
    tick: 42,
    entities: [],
});
const createMessage = () => ({
    id: "inject-1",
    type: INJECT_FRAME_MESSAGE,
    payload: {
        frame: createFrame(),
    },
});
describe("InjectFrameOperation", () => {
    it("delegates to evaluation player ingestFrame with the payload frame", async () => {
        const ingestFrame = vi.fn();
        const playerStub = { ingestFrame };
        const operation = new InjectFrameOperation();
        const message = createMessage();
        await operation.execute(playerStub, message);
        expect(ingestFrame).toHaveBeenCalledTimes(1);
        expect(ingestFrame).toHaveBeenCalledWith(message.payload.frame);
    });
    it("yields success acknowledgement through a MessageHandler", async () => {
        const playerStub = {
            ingestFrame: vi.fn(),
        };
        const handler = new MessageHandler([new InjectFrameOperation()]);
        const message = createMessage();
        const acknowledgement = await handler.handle(playerStub, message);
        expect(acknowledgement.status).toBe("success");
        expect(acknowledgement.messageId).toBe(message.id);
    });
});
