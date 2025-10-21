import { describe, expect, it, vi } from "vitest";
import { MessageHandler } from "../../../messaging/inbound/MessageHandler.js";
import { StartOperation, START_OPERATION_MESSAGE } from "../Start.js";
const createMessage = () => ({
    id: "msg-start",
    type: START_OPERATION_MESSAGE,
    payload: { arbitrary: "data" },
});
describe("StartOperation", () => {
    it("delegates to player.start()", async () => {
        const startSpy = vi.fn();
        const playerStub = {
            start: startSpy,
            pause: vi.fn(),
            stop: vi.fn(),
        };
        const message = createMessage();
        const operation = new StartOperation();
        await operation.execute(playerStub, message);
        expect(startSpy).toHaveBeenCalledTimes(1);
    });
    it("yields success acknowledgement through MessageHandler", async () => {
        const playerStub = {
            start: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
        };
        const message = createMessage();
        const handler = new MessageHandler([new StartOperation()]);
        const acknowledgement = await handler.handle(playerStub, message);
        expect(acknowledgement.status).toBe("success");
        expect(acknowledgement.messageId).toBe(message.id);
    });
});
