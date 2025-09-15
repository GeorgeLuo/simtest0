import { Message, MessageHandler } from "../../../MessageHandler";

export interface PauseCommand extends Message<"pause", undefined> {}

/**
 * Handler stub for pausing the simulation playback.
 */
export abstract class PauseHandler extends MessageHandler<PauseCommand> {}
