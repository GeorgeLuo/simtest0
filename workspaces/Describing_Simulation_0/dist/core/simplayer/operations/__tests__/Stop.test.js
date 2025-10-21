import { describe, expect, it, vi } from "vitest";
import { MessageHandler } from "../../../messaging/inbound/MessageHandler.js";
import { StopOperation, STOP_OPERATION_MESSAGE } from "../Stop.js";
const createMessage = () => ({
    id: "msg-stop",
    type: STOP_OPERATION_MESSAGE,
    payload: null,
});
describe("StopOperation", () => {
    it("delegates to player.stop()", async () => {
        const stopSpy = vi.fn();
        const playerStub = {
            start: vi.fn(),
            pause: vi.fn(),
            stop: stopSpy,
        };
        const operation = new StopOperation();
        await operation.execute(playerStub, createMessage());
        expect(stopSpy).toHaveBeenCalledTimes(1);
    });
    it("returns success acknowledgement with MessageHandler", async () => {
        const playerStub = {
            start: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
        };
        const handler = new MessageHandler([new StopOperation()]);
        const message = createMessage();
        const acknowledgement = await handler.handle(playerStub, message);
        expect(acknowledgement.status).toBe("success");
        expect(acknowledgement.messageId).toBe(message.id);
    });
});
