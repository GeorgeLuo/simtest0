import type { EvaluationPlayer, FrameRecord } from '../EvaluationPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface InjectFramePayload extends FrameRecord {
  messageId: string;
}

export class InjectFrameOperation {
  execute(player: EvaluationPlayer, payload: InjectFramePayload): Acknowledgement {
    player.injectFrame(payload);
    return { messageId: payload.messageId, status: 'success' };
  }
}
