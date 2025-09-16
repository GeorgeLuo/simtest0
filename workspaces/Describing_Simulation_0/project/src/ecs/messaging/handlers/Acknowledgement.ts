import type { Message } from '../MessageHandler.js';

export type AcknowledgementStatus = 'success' | 'error';

export type AcknowledgementPayload = {
  status: AcknowledgementStatus;
  messageId?: string;
  error?: string;
};

export type AcknowledgementMessage = Message<
  'acknowledgement',
  AcknowledgementPayload
>;

export function createSuccessAcknowledgement(
  messageId?: string,
): AcknowledgementMessage {
  return {
    type: 'acknowledgement',
    payload: {
      status: 'success',
      messageId,
    },
  };
}

export function createErrorAcknowledgement(
  messageId: string | undefined,
  error: unknown,
): AcknowledgementMessage {
  return {
    type: 'acknowledgement',
    payload: {
      status: 'error',
      messageId,
      error: error instanceof Error ? error.message : String(error),
    },
  };
}
