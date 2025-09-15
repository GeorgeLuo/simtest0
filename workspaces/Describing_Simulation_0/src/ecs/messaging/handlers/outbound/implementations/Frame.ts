import { Message } from "../../../MessageHandler";

export interface EntitySnapshot {
  readonly id: string;
  readonly components: Record<string, unknown>;
}

export interface FramePayload {
  readonly tick: number;
  readonly entities: readonly EntitySnapshot[];
}

export type FrameMessage = Message<"frame", FramePayload>;
