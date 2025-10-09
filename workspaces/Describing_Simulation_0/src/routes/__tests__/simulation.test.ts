import { registerSimulationRoutes } from '../simulation';
import type { Router } from '../router';
import type { IOPlayer } from '../../core/simplayer/IOPlayer';
import type { Bus } from '../../core/messaging/Bus';
import type { Frame } from '../../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../../core/messaging/outbound/Acknowledgement';
import type { System } from '../../core/systems/System';
import type { SimulationSystemDescriptor } from '../simulation';

describe('simulation routes', () => {
  const createRouter = () => {
    const map = new Map<string, (req: any, res: any) => void>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => void) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };
    return { router, map };
  };

  const createDeps = () => {
    const player = {
      start: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      injectSystem: jest.fn(),
      ejectSystem: jest.fn(),
    } as unknown as Pick<IOPlayer, 'start' | 'pause' | 'stop' | 'injectSystem' | 'ejectSystem'>;

    const outboundBus = {
      subscribe: jest.fn(() => jest.fn()),
    } as unknown as Bus<Frame | Acknowledgement> & { subscribe: jest.Mock };

    const loadSystem = jest.fn<Promise<System>, [SimulationSystemDescriptor]>(
      async () => ({} as unknown as System),
    );

    return { player, outboundBus, loadSystem };
  };

  it('registers control endpoints and invokes player hooks', async () => {
    const { router, map } = createRouter();
    const deps = createDeps();

    expect(() => registerSimulationRoutes(router, deps)).not.toThrow();

    const startHandler = map.get('/simulation/start');
    const pauseHandler = map.get('/simulation/pause');
    const stopHandler = map.get('/simulation/stop');
    const injectHandler = map.get('/simulation/inject');
    const ejectHandler = map.get('/simulation/eject');

    expect(startHandler).toBeDefined();
    expect(pauseHandler).toBeDefined();
    expect(stopHandler).toBeDefined();
    expect(injectHandler).toBeDefined();
    expect(ejectHandler).toBeDefined();

    const createRes = () => ({ json: jest.fn() });

    const startRes = createRes();
    startHandler?.({ body: { messageId: 'start-1' } }, startRes);
    expect(startRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'start-1' });

    const pauseRes = createRes();
    pauseHandler?.({ body: { messageId: 'pause-1' } }, pauseRes);
    expect(pauseRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'pause-1' });

    const stopRes = createRes();
    stopHandler?.({ body: { messageId: 'stop-1' } }, stopRes);
    expect(stopRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'stop-1' });

    const injectRes = createRes();
    await injectHandler?.({ body: { messageId: 'inject-1', system: { modulePath: 'plugins/mod.js' } } }, injectRes);
    expect(injectRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'inject-1' });
    expect(deps.loadSystem).toHaveBeenCalledWith({ modulePath: 'plugins/mod.js' });
    expect((deps.player.injectSystem as jest.Mock)).toHaveBeenCalledTimes(1);

    const ejectRes = createRes();
    ejectHandler?.({ body: { messageId: 'eject-1', system: { id: 'sys1' } } }, ejectRes);
    expect(ejectRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'eject-1' });

    expect((deps.player.start as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((deps.player.pause as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((deps.player.stop as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((deps.player.injectSystem as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((deps.player.ejectSystem as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('returns error when system descriptor missing', async () => {
    const { router, map } = createRouter();
    const deps = createDeps();
    registerSimulationRoutes(router, deps);

    const injectHandler = map.get('/simulation/inject');
    const res = { json: jest.fn(), statusCode: 200 };
    await injectHandler?.({ body: { messageId: 'inject-missing' } }, res);

    expect(res.statusCode).toBe(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'inject-missing',
      detail: 'Missing system descriptor',
    });
    expect(deps.loadSystem).not.toHaveBeenCalled();
  });
});
