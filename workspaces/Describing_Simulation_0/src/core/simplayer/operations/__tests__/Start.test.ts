import { Start } from '../Start';
import type { IOPlayer } from '../../../IOPlayer';

describe('Start operation', () => {
  it('invokes player.start and returns success acknowledgement', () => {
    const player = {
      start: jest.fn(),
    } as unknown as IOPlayer & { start: jest.Mock };
    const operation = new Start();

    const acknowledgement = operation.execute(player, { messageId: 'msg-1' });

    expect(player.start).toHaveBeenCalled();
    expect(acknowledgement).toEqual({ messageId: 'msg-1', status: 'success' });
  });
});
