// Skeleton for outbound acknowledgement structure.
export type AcknowledgementStatus = 'success' | 'error';

export interface Acknowledgement {
  messageId: string;
  status: AcknowledgementStatus;
  detail?: string;
  systemId?: string;
}
