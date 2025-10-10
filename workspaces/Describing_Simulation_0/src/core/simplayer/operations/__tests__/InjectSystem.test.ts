import { InjectSystem } from '../InjectSystem';
import type { IOPlayer } from '../../../IOPlayer';
import type { System } from '../../../systems/System';

describe('InjectSystem operation', () => {
  it('adds system to player and returns acknowledgement', () => {
    const operation = new InjectSystem();
    const system = {} as System;
    const player = {
      injectSystem: jest.fn(),
    } as unknown as IOPlayer & { injectSystem: jest.Mock };

    const acknowledgement = operation.execute(player, { messageId: 'msg-1', system });

    expect(player.injectSystem).toHaveBeenCalledWith({ system });
    expect(acknowledgement).toEqual({ messageId: 'msg-1', status: 'success' });
  });

  it('throws when system payload missing', () => {
    const operation = new InjectSystem();
    const player = {
      injectSystem: jest.fn(),
    } as unknown as IOPlayer;

    expect(() =>
      operation.execute(player, { messageId: 'msg-2', system: undefined as unknown as System }),
    ).toThrow('System payload is required for injection');
  });
});
