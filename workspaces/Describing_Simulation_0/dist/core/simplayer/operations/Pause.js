import { SIMULATION_PAUSE_MESSAGE } from "../messages.js";
export class PauseOperation {
    execute(player, _message) {
        player.pause();
    }
}
export const PAUSE_OPERATION_MESSAGE = SIMULATION_PAUSE_MESSAGE;
