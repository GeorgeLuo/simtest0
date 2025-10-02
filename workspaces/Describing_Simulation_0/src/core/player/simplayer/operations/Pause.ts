import type { Operation } from "../../../messaging/inbound/Operation";
import type { CommandMessage } from "../../IOPlayer";
import type { SimulationPlayer } from "../SimulationPlayer";

export function createPauseOperation(): Operation<SimulationPlayer, CommandMessage> {
  return {
    execute: (player) => {
      player.pause();
    },
  };
}
