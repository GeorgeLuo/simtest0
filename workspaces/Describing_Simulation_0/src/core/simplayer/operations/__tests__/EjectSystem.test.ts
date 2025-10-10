import { EjectSystem } from '../EjectSystem';
import type { IOPlayer } from '../../../IOPlayer';
import type { System } from '../../../systems/System';

describe('EjectSystem operation', () => {
  it('calls player.ejectSystem and returns success acknowledgement', () => {
    const player = {
      ejectSystem: jest.fn(),
    } as unknown as IOPlayer & { ejectSystem: jest.Mock };
    const operation = new EjectSystem();
    const system = {} as System;
    const payload = { messageId: 'msg-5', system };

    const acknowledgement = operation.execute(player, payload);

    expect(player.ejectSystem).toHaveBeenCalledWith({ system });
    expect(acknowledgement).toEqual({ messageId: 'msg-5', status: 'success' });
  });
});
