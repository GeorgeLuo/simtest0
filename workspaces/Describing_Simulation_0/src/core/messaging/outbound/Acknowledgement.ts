export type AcknowledgementStatus = "ok" | "error";

export interface Acknowledgement {
  id: string;
  status: AcknowledgementStatus;
  error?: string;
}

export const acknowledgeSuccess = (id: string): Acknowledgement => ({
  id,
  status: "ok",
});

export const acknowledgeFailure = (id: string, error: string): Acknowledgement => ({
  id,
  status: "error",
  error,
});
