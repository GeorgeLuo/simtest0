import { InjectFrameOperation, type InjectFramePayload } from '../InjectFrameOperation';
import type { EvaluationPlayer } from '../../EvaluationPlayer';

describe('InjectFrameOperation', () => {
  it('delegates to player.injectFrame and returns acknowledgement', () => {
    const player = {
      injectFrame: jest.fn(),
    } as unknown as EvaluationPlayer & { injectFrame: jest.Mock };

    const operation = new InjectFrameOperation();
    const payload: InjectFramePayload = { messageId: 'frame-1', frame: { tick: 1, entities: {} } };

    const acknowledgement = operation.execute(player, payload);

    expect(player.injectFrame).toHaveBeenCalledWith(payload);
    expect(acknowledgement).toEqual({ messageId: 'frame-1', status: 'success' });
  });
});
