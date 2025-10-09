import { RemoveConditionOperation, type RemoveConditionPayload } from '../RemoveConditionOperation';
import type { EvaluationPlayer } from '../../EvaluationPlayer';

describe('RemoveConditionOperation', () => {
  it('delegates to player.removeCondition and returns acknowledgement', () => {
    const player = {
      removeCondition: jest.fn(),
    } as unknown as EvaluationPlayer & { removeCondition: jest.Mock };

    const operation = new RemoveConditionOperation();
    const payload: RemoveConditionPayload = { messageId: 'cond-2', conditionId: 'cond-1' };

    const acknowledgement = operation.execute(player, payload);

    expect(player.removeCondition).toHaveBeenCalledWith(payload);
    expect(acknowledgement).toEqual({ messageId: 'cond-2', status: 'success' });
  });
});
