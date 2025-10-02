import type { Operation } from "../../../messaging/inbound/Operation";
import type { CommandMessage } from "../../IOPlayer";
import type { SimulationPlayer } from "../SimulationPlayer";
import type { System } from "../../../systems/System";

export interface EjectSystemPayload {
  system: System;
}

export function createEjectSystemOperation(): Operation<SimulationPlayer, CommandMessage> {
  return {
    execute(player, message) {
      if (message.type !== "eject") {
        return;
      }

      const payload = message.payload as EjectSystemPayload | undefined;
      if (!payload?.system) {
        throw new Error("Missing payload for eject command");
      }

      player.removeSystem(payload.system);
    },
  };
}
