import { Message, MessageHandler } from "../../../MessageHandler";

export interface StartCommand extends Message<"start", undefined> {}

/**
 * Handler stub for triggering the player start lifecycle event.
 */
export abstract class StartHandler extends MessageHandler<StartCommand> {}
