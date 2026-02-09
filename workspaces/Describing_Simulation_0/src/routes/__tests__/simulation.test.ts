import { registerSimulationRoutes } from '../simulation';
import type { Router } from '../router';
import type { IOPlayer, Bus, Frame, Acknowledgement, System } from '@georgeluo/ecs';
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
      injectSystem: jest.fn(() => 'system-123'),
      ejectSystem: jest.fn(() => true),
      registerComponent: jest.fn(),
      removeComponent: jest.fn(() => true),
    } as unknown as Pick<IOPlayer, 'start' | 'pause' | 'stop'> & {
      injectSystem: jest.Mock;
      ejectSystem: jest.Mock;
      registerComponent: jest.Mock;
      removeComponent: jest.Mock;
    };

    const subscriptionCallbacks: Array<(message: Frame | Acknowledgement) => void> = [];
    const unsubscribeMocks: jest.Mock[] = [];
    const outboundBus = {
      subscribe: jest.fn((callback: (message: Frame | Acknowledgement) => void) => {
        subscriptionCallbacks.push(callback);
        const unsub = jest.fn();
        unsubscribeMocks.push(unsub);
        return unsub;
      }),
    } as unknown as Bus<Frame | Acknowledgement> & { subscribe: jest.Mock };

    const loadSystem = jest.fn<Promise<System>, [SimulationSystemDescriptor]>(async () => ({} as System));
    const loadComponent = jest.fn(async () => ({ id: 'component', validate: () => true }));

    return { player, outboundBus, loadSystem, loadComponent, subscriptionCallbacks, unsubscribeMocks };
  };

  it('registers control endpoints and invokes player hooks', async () => {
    const { router, map } = createRouter();
    const deps = createDeps();

    expect(() => registerSimulationRoutes(router, deps)).not.toThrow();

    const startHandler = map.get('/simulation/start');
    const pauseHandler = map.get('/simulation/pause');
    const stopHandler = map.get('/simulation/stop');
    const injectHandler = map.get('/simulation/inject');
    const injectAlias = map.get('/simulation/system');
    const ejectHandler = map.get('/simulation/eject');
    const ejectAlias = map.get('/simulation/system/:systemId');
    const componentHandler = map.get('/simulation/component');
    const componentAlias = map.get('/simulation/component/inject');
    const componentEjectHandler = map.get('/simulation/component/:componentId');
    const componentEjectAlias = map.get('/simulation/component/eject');

    expect(startHandler).toBeDefined();
    expect(pauseHandler).toBeDefined();
    expect(stopHandler).toBeDefined();
    expect(injectHandler).toBeDefined();
    expect(injectAlias).toBe(injectHandler);
    expect(ejectHandler).toBeDefined();
    expect(ejectAlias).toBe(ejectHandler);
    expect(componentHandler).toBeDefined();
    expect(componentAlias).toBe(componentHandler);
    expect(componentEjectHandler).toBeDefined();
    expect(componentEjectAlias).toBe(componentEjectHandler);

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
    expect(injectRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'inject-1',
      systemId: 'system-123',
    });
    expect(deps.loadSystem).toHaveBeenCalledWith({ modulePath: 'plugins/mod.js' });
    expect((deps.player.injectSystem as jest.Mock)).toHaveBeenCalledTimes(1);

    const ejectRes = createRes();
    ejectHandler?.({ body: { messageId: 'eject-1', systemId: 'system-123' } }, ejectRes);
    expect(ejectRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'eject-1',
      systemId: 'system-123',
    });

    const componentRes = createRes();
    await componentHandler?.(
      { body: { messageId: 'comp-1', component: { modulePath: 'plugins/component.js' } } },
      componentRes,
    );
    expect(deps.loadComponent).toHaveBeenCalledWith({ modulePath: 'plugins/component.js' });
    expect(deps.player.registerComponent).toHaveBeenCalled();
    expect(componentRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'comp-1' });

    const componentEjectRes = createRes();
    componentEjectHandler?.({ params: { componentId: 'temperature' }, body: { messageId: 'comp-2' } }, componentEjectRes);
    expect(deps.player.removeComponent).toHaveBeenCalledWith('temperature');
    expect(componentEjectRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'comp-2' });

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

  it('returns errors for missing or unknown systemId on eject', async () => {
    const { router, map } = createRouter();
    const deps = createDeps();
    (deps.player.ejectSystem as jest.Mock).mockReturnValueOnce(false);
    registerSimulationRoutes(router, deps);

    const handler = map.get('/simulation/eject');
    const missingRes = { json: jest.fn(), statusCode: 200 };
    handler?.({ body: { messageId: 'missing' } }, missingRes);
    expect(missingRes.statusCode).toBe(400);
    expect(missingRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'missing',
      detail: 'Missing system identifier',
    });

    const notFoundRes = { json: jest.fn(), statusCode: 200 };
    handler?.({ body: { messageId: 'not-found', systemId: 'system-missing' } }, notFoundRes);
    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'not-found',
      detail: 'System not found',
    });

    const componentHandler = map.get('/simulation/component');
    const compMissingRes = { json: jest.fn(), statusCode: 200 };
    await componentHandler?.({ body: { messageId: 'comp-missing' } }, compMissingRes);
    expect(compMissingRes.statusCode).toBe(400);
    expect(compMissingRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'comp-missing',
      detail: 'Missing component descriptor',
    });

    const componentEjectHandler = map.get('/simulation/component/:componentId');
    const compEjectRes = { json: jest.fn(), statusCode: 200 };
    componentEjectHandler?.({ body: { messageId: 'comp-eject' } }, compEjectRes);
    expect(compEjectRes.statusCode).toBe(400);
    expect(compEjectRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'comp-eject',
      detail: 'Missing component identifier',
    });
  });

  it('emits heartbeat comments, replays last message, and cleans up on disconnect for stream endpoint', () => {
    jest.useFakeTimers({ advanceTimers: true });

    const { router, map } = createRouter();
    const deps = createDeps();
    registerSimulationRoutes(router, deps);

    const lastPublished = deps.subscriptionCallbacks[0];
    lastPublished?.({ tick: 42, entities: {} } as Frame);

    const streamHandler = map.get('/simulation/stream');
    const writes: string[] = [];
    const res = {
      writeHead: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn((chunk: string) => {
        writes.push(chunk);
      }),
      end: jest.fn(),
    };

    const listeners = new Map<string, () => void>();
    const req = {
      on: jest.fn((event: string, handler: () => void) => {
        listeners.set(event, handler);
      }),
    };

    streamHandler?.(req, res);

    expect(res.write).toHaveBeenCalledWith(':connected\n\n');
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"tick":42'));

    jest.advanceTimersByTime(15000);
    expect(res.write).toHaveBeenCalledWith(':heartbeat\n\n');

    const initialWrites = writes.length;
    listeners.get('close')?.();
    const streamUnsubscribe = deps.unsubscribeMocks[deps.unsubscribeMocks.length - 1];
    expect(streamUnsubscribe).toBeDefined();
    expect(streamUnsubscribe).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();

    jest.advanceTimersByTime(15000);
    expect(writes.length).toBe(initialWrites);

    jest.useRealTimers();
  });
});
