import { PauseOperation } from '../PauseOperation';
import type { IOPlayer } from '../../IOPlayer';

describe('PauseOperation', () => {
  it('invokes player.pause and returns success acknowledgement', () => {
    const player = {
      pause: jest.fn(),
    } as unknown as IOPlayer & { pause: jest.Mock };
    const operation = new PauseOperation();

    const acknowledgement = operation.execute(player, { messageId: 'msg-2' });

    expect(player.pause).toHaveBeenCalled();
    expect(acknowledgement).toEqual({ messageId: 'msg-2', status: 'success' });
  });
});
