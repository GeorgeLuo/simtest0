import { Message, MessageHandler } from "../../../MessageHandler";

export interface InjectEntityPayload {
  readonly entityId?: string;
  readonly components: Record<string, unknown>;
}

export interface InjectEntityCommand extends Message<"inject-entity", InjectEntityPayload> {}

/**
 * Handler stub for injecting an externally defined entity into the simulation.
 */
export abstract class InjectEntityHandler extends MessageHandler<InjectEntityCommand> {}
