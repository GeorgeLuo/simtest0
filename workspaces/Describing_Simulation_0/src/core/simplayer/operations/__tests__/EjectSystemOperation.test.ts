import { EjectSystemOperation } from '../EjectSystemOperation';
import type { IOPlayer } from '../../IOPlayer';
import type { System } from '../../../systems/System';

describe('EjectSystemOperation', () => {
  it('calls player.ejectSystem and returns success acknowledgement', () => {
    const player = {
      ejectSystem: jest.fn(),
    } as unknown as IOPlayer & { ejectSystem: jest.Mock };
    const operation = new EjectSystemOperation();
    const system = {} as System;
    const payload = { messageId: 'msg-5', system };

    const acknowledgement = operation.execute(player, payload);

    expect(player.ejectSystem).toHaveBeenCalledWith({ system });
    expect(acknowledgement).toEqual({ messageId: 'msg-5', status: 'success' });
  });
});
