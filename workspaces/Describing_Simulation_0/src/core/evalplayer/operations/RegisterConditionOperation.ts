import type { EvaluationPlayer, ConditionRecord } from '../EvaluationPlayer';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';

export interface RegisterConditionPayload extends ConditionRecord {
  messageId: string;
}

export class RegisterConditionOperation {
  execute(player: EvaluationPlayer, payload: RegisterConditionPayload): Acknowledgement {
    player.registerCondition(payload);
    return { messageId: payload.messageId, status: 'success' };
  }
}
