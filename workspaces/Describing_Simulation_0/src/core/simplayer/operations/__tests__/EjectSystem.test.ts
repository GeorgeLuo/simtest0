import { EjectSystem } from '../EjectSystem';
import type { IOPlayer } from '../../../IOPlayer';
import type { System } from '../../../systems/System';

describe('EjectSystem operation', () => {
  it('calls player.ejectSystem and returns success acknowledgement', () => {
    const player = {
      ejectSystem: jest.fn(() => true),
    } as unknown as IOPlayer & { ejectSystem: jest.Mock };
    const operation = new EjectSystem();
    const system = {} as System;
    const payload = { messageId: 'msg-5', system };

    const acknowledgement = operation.execute(player, payload);

    expect(player.ejectSystem).toHaveBeenCalledWith({ system, systemId: undefined });
    expect(acknowledgement).toEqual({ messageId: 'msg-5', status: 'success' });
  });

  it('returns error acknowledgement when system not found', () => {
    const player = {
      ejectSystem: jest.fn(() => false),
    } as unknown as IOPlayer & { ejectSystem: jest.Mock };
    const operation = new EjectSystem();

    const acknowledgement = operation.execute(player, { messageId: 'msg-6', systemId: 'system-missing' });

    expect(player.ejectSystem).toHaveBeenCalledWith({ system: undefined, systemId: 'system-missing' });
    expect(acknowledgement).toEqual({
      messageId: 'msg-6',
      status: 'error',
      detail: 'System not found',
    });
  });
});
