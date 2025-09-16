import type { PlayerSnapshot } from '../../../../Player.js';
import type { Message } from '../../../MessageHandler.js';

export type FramePayload = PlayerSnapshot;

export type FrameMessage = Message<'frame', FramePayload>;

export function createFrameMessage(payload: FramePayload): FrameMessage {
  return {
    type: 'frame',
    payload,
  };
}
