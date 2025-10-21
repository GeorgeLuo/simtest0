import { SIMULATION_STOP_MESSAGE } from "../messages.js";
export class StopOperation {
    execute(player, _message) {
        player.stop();
    }
}
export const STOP_OPERATION_MESSAGE = SIMULATION_STOP_MESSAGE;
