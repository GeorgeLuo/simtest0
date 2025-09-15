import { Message, MessageHandler } from "../../../MessageHandler";

export interface StopCommand extends Message<"stop", undefined> {}

/**
 * Handler stub for stopping and resetting the simulation engine.
 */
export abstract class StopHandler extends MessageHandler<StopCommand> {}
