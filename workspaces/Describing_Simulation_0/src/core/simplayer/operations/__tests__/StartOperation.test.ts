import { StartOperation } from '../StartOperation';
import type { IOPlayer } from '../../IOPlayer';

describe('StartOperation', () => {
  it('invokes player.start and returns success acknowledgement', () => {
    const player = {
      start: jest.fn(),
    } as unknown as IOPlayer & { start: jest.Mock };
    const operation = new StartOperation();

    const acknowledgement = operation.execute(player, { messageId: 'msg-1' });

    expect(player.start).toHaveBeenCalled();
    expect(acknowledgement).toEqual({ messageId: 'msg-1', status: 'success' });
  });
});
