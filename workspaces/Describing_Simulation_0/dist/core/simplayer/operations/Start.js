import { SIMULATION_START_MESSAGE } from "../messages.js";
export class StartOperation {
    execute(player, _message) {
        player.start();
    }
}
export const START_OPERATION_MESSAGE = SIMULATION_START_MESSAGE;
