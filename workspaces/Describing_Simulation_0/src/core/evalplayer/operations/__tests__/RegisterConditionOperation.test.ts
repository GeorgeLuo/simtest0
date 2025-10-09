import { RegisterConditionOperation, type RegisterConditionPayload } from '../RegisterConditionOperation';
import type { EvaluationPlayer } from '../../EvaluationPlayer';

describe('RegisterConditionOperation', () => {
  it('delegates to player.registerCondition and returns acknowledgement', () => {
    const player = {
      registerCondition: jest.fn(),
    } as unknown as EvaluationPlayer & { registerCondition: jest.Mock };

    const operation = new RegisterConditionOperation();
    const payload: RegisterConditionPayload = { messageId: 'cond-1', conditionId: 'cond-1', definition: {} };

    const acknowledgement = operation.execute(player, payload);

    expect(player.registerCondition).toHaveBeenCalledWith(payload);
    expect(acknowledgement).toEqual({ messageId: 'cond-1', status: 'success' });
  });
});
