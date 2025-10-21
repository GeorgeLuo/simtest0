import { IOPlayer } from "../../IOPlayer.js";
import { InboundMessage } from "../../messaging/inbound/InboundMessage.js";
import { Operation } from "../../messaging/inbound/Operation.js";
import {
  InjectSystemPayload,
  SimulationPlayer,
} from "../SimulationPlayer.js";

export class InjectSystemOperation
implements Operation<InjectSystemPayload> {
  async execute(
    player: IOPlayer,
    message: InboundMessage<InjectSystemPayload>,
  ): Promise<void> {
    const simulationPlayer = player as SimulationPlayer;
    await simulationPlayer.injectSystem(message.payload);
  }
}

export class EjectSystemOperation implements Operation<{ id: string }> {
  async execute(
    player: IOPlayer,
    message: InboundMessage<{ id: string }>,
  ): Promise<void> {
    const simulationPlayer = player as SimulationPlayer;
    const id = message.payload?.id;
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("System id must be provided for ejection");
    }
    simulationPlayer.removeSystem(id);
  }
}
