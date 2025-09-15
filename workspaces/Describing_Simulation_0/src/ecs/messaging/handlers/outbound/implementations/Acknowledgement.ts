import { Message } from "../../../MessageHandler";

export type AcknowledgementStatus = "success" | "error";

export interface AcknowledgementPayload {
  readonly messageId?: string;
  readonly status: AcknowledgementStatus;
  readonly detail?: string;
}

export type AcknowledgementMessage = Message<"acknowledgement", AcknowledgementPayload>;
