import { InjectFrame } from '../InjectFrame';
import type { EvaluationPlayer, FrameRecord } from '../../EvaluationPlayer';

describe('InjectFrame operation', () => {
  it('calls player.injectFrame and returns success acknowledgement', () => {
    const player = {
      injectFrame: jest.fn(),
    } as unknown as EvaluationPlayer & { injectFrame: jest.Mock };

    const operation = new InjectFrame();
    const payload: FrameRecord & { messageId: string } = {
      messageId: 'msg-3',
      frame: { tick: 1, entities: {} },
    };

    const acknowledgement = operation.execute(player, payload);

    expect(player.injectFrame).toHaveBeenCalledWith(payload);
    expect(acknowledgement).toEqual({ messageId: 'msg-3', status: 'success' });
  });
});
