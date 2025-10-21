export class InjectSystemOperation {
    async execute(player, message) {
        const simulationPlayer = player;
        await simulationPlayer.injectSystem(message.payload);
    }
}
export class EjectSystemOperation {
    async execute(player, message) {
        const simulationPlayer = player;
        const id = message.payload?.id;
        if (typeof id !== "string" || id.length === 0) {
            throw new Error("System id must be provided for ejection");
        }
        simulationPlayer.removeSystem(id);
    }
}
