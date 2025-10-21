export type AcknowledgementStatus = "success" | "error";

export interface Acknowledgement {
  readonly messageId: string;
  readonly status: AcknowledgementStatus;
  readonly error?: string;
  readonly payload?: unknown;
}

export const successAck = (
  messageId: string,
  payload?: unknown,
): Acknowledgement => ({
  messageId,
  status: "success",
  ...(payload === undefined ? {} : { payload }),
});

export const errorAck = (
  messageId: string,
  error: string,
): Acknowledgement => ({
  messageId,
  status: "error",
  error,
});
