import { errorAck, successAck } from "../outbound/Acknowledgement.js";
export class MessageHandler {
    operations;
    constructor(operations) {
        this.operations = operations;
    }
    async handle(player, message) {
        try {
            for (const operation of this.operations) {
                await operation.execute(player, message);
            }
            return successAck(message.id);
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : "Unknown handler error";
            return errorAck(message.id, reason);
        }
    }
}
