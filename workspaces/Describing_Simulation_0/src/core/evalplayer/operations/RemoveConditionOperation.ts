import type { EvaluationPlayer } from '../EvaluationPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface RemoveConditionPayload {
  messageId: string;
  conditionId: string;
}

export class RemoveConditionOperation {
  execute(player: EvaluationPlayer, payload: RemoveConditionPayload): Acknowledgement {
    player.removeCondition(payload);
    return { messageId: payload.messageId, status: 'success' };
  }
}
