import { Operation } from '../../messaging/inbound/Operation';
import { Frame } from '../../messaging/outbound/Frame';

/** Placeholder operation representing ingestion of outbound frames for evaluation. */
export const injectFrameOperation: Operation = (_player, payload) => {
  const frame = payload.frame as Frame | undefined;
  if (!frame) {
    return { status: 'error', message: 'Missing frame payload.' };
  }

  return { status: 'ok' };
};
