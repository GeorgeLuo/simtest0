import type { EvaluationPlayer, FrameRecord } from '../EvaluationPlayer';
import type { Operation } from '../../messaging/inbound/Operation';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface InjectFramePayload extends FrameRecord {
  messageId: string;
}

export class InjectFrame implements Operation<EvaluationPlayer, InjectFramePayload> {
  execute(player: EvaluationPlayer, payload: InjectFramePayload): Acknowledgement {
    if (typeof (player as { start?: () => void }).start === 'function') {
      (player as { start: () => void }).start();
    }
    player.injectFrame(payload);
    return { messageId: payload.messageId, status: 'success' };
  }
}
