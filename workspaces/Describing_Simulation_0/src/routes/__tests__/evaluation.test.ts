import { registerEvaluationRoutes, type EvaluationComponentDescriptor, type EvaluationSystemDescriptor } from '../evaluation';
import type { Router } from '../router';
import type { EvaluationPlayer } from '../../core/evalplayer/EvaluationPlayer';
import type { Bus } from '../../core/messaging/Bus';
import type { Frame } from '../../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../../core/messaging/outbound/Acknowledgement';
import type { System } from '../../core/systems/System';
import type { ComponentType } from '../../core/components/ComponentType';

describe('evaluation routes', () => {
  const createRouter = () => {
    const map = new Map<string, (req: any, res: any) => void>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => void) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };

    return { router, routes: map };
  };

  const createDeps = () => {
    const player = {
      injectFrame: jest.fn(),
      injectSystem: jest.fn(() => 'system-abc'),
      ejectSystem: jest.fn(() => true),
      registerComponent: jest.fn(),
      removeComponent: jest.fn(),
    } as unknown as EvaluationPlayer & {
      injectFrame: jest.Mock;
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
        const unsubscriber = jest.fn();
        unsubscribeMocks.push(unsubscriber);
        return unsubscriber;
      }),
    } as unknown as Bus<Frame | Acknowledgement> & { subscribe: jest.Mock };

    const loadSystem = jest.fn<Promise<System>, [EvaluationSystemDescriptor]>(async () => ({} as System));
    const loadComponent = jest.fn<Promise<ComponentType<unknown>>, [EvaluationComponentDescriptor]>(
      async () => ({ id: 'component', validate: () => true }),
    );

    return { player, outboundBus, loadSystem, loadComponent, subscriptionCallbacks, unsubscribeMocks };
  };

  it('registers evaluation endpoints and delegates to dependencies', async () => {
    const { router, routes } = createRouter();
    const deps = createDeps();

    registerEvaluationRoutes(router, deps);

    const frameHandler = routes.get('/evaluation/frame');
    const injectSystemHandler = routes.get('/evaluation/system/inject');
    const injectSystemAlias = routes.get('/evaluation/system');
    const ejectSystemHandler = routes.get('/evaluation/system/eject');
    const ejectSystemAlias = routes.get('/evaluation/system/:systemId');
    const injectComponentHandler = routes.get('/evaluation/component/inject');
    const injectComponentAlias = routes.get('/evaluation/component');
    const ejectComponentHandler = routes.get('/evaluation/component/eject');
    const ejectComponentAlias = routes.get('/evaluation/component/:componentId');
    const streamHandler = routes.get('/evaluation/stream');

    expect(frameHandler).toBeDefined();
    expect(injectSystemHandler).toBeDefined();
    expect(injectSystemAlias).toBe(injectSystemHandler);
    expect(ejectSystemHandler).toBeDefined();
    expect(ejectSystemAlias).toBe(ejectSystemHandler);
    expect(injectComponentHandler).toBeDefined();
    expect(injectComponentAlias).toBe(injectComponentHandler);
    expect(ejectComponentHandler).toBeDefined();
    expect(ejectComponentAlias).toBe(ejectComponentHandler);
    expect(streamHandler).toBeDefined();

    const frameRes = { json: jest.fn() };
    frameHandler?.({ body: { messageId: 'frame-1', frame: { tick: 1, entities: {} } } }, frameRes);
    expect(deps.player.injectFrame).toHaveBeenCalledWith({ messageId: 'frame-1', frame: { tick: 1, entities: {} } });
    expect(frameRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'frame-1' });

    const systemRes = { json: jest.fn(), statusCode: 200 };
    await injectSystemHandler?.({ body: { messageId: 'sys-1', system: { modulePath: 'plugins/eval/System.js' } } }, systemRes);
    expect(deps.loadSystem).toHaveBeenCalledWith({ modulePath: 'plugins/eval/System.js' });
    expect(deps.player.injectSystem).toHaveBeenCalled();
    expect(systemRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'sys-1',
      systemId: 'system-abc',
    });

    const ejectSystemRes = { json: jest.fn(), statusCode: 200 };
    ejectSystemHandler?.({ body: { messageId: 'sys-2', systemId: 'system-abc' } }, ejectSystemRes);
    expect(deps.player.ejectSystem).toHaveBeenCalledWith({ system: undefined, systemId: 'system-abc' });
    expect(ejectSystemRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'sys-2',
      systemId: 'system-abc',
    });

    const ejectSystemParamRes = { json: jest.fn(), statusCode: 200 };
    ejectSystemAlias?.({ params: { systemId: 'system-alias' }, body: { messageId: 'sys-3' } }, ejectSystemParamRes);
    expect(deps.player.ejectSystem).toHaveBeenCalledWith({ system: undefined, systemId: 'system-alias' });
    expect(ejectSystemParamRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'sys-3',
      systemId: 'system-alias',
    });

    const componentRes = { json: jest.fn(), statusCode: 200 };
    await injectComponentHandler?.(
      { body: { messageId: 'comp-1', component: { modulePath: 'plugins/eval/component.js' } } },
      componentRes,
    );
    expect(deps.loadComponent).toHaveBeenCalledWith({ modulePath: 'plugins/eval/component.js' });
    expect(deps.player.registerComponent).toHaveBeenCalled();
    expect(componentRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'comp-1' });

    const ejectComponentRes = { json: jest.fn(), statusCode: 200 };
    ejectComponentHandler?.({ body: { messageId: 'comp-2', componentId: 'component' } }, ejectComponentRes);
    expect(deps.player.removeComponent).toHaveBeenCalledWith('component');
    expect(ejectComponentRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'comp-2' });
  });

  it('returns error when evaluation descriptors are missing', async () => {
    const { router, routes } = createRouter();
    const deps = createDeps();

    registerEvaluationRoutes(router, deps);

    const injectSystemHandler = routes.get('/evaluation/system/inject');
    const injectComponentHandler = routes.get('/evaluation/component/inject');
    const ejectSystemHandler = routes.get('/evaluation/system/eject');
    const ejectComponentHandler = routes.get('/evaluation/component/eject');

    const errorRes = { json: jest.fn(), statusCode: 200 };
    await injectSystemHandler?.({ body: { messageId: 'sys-err' } }, errorRes);
    expect(errorRes.statusCode).toBe(400);
    expect(errorRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'sys-err',
      detail: 'Missing system descriptor',
    });

    const ejectSystemRes = { json: jest.fn(), statusCode: 200 };
    ejectSystemHandler?.({ body: { messageId: 'sys-err2' } }, ejectSystemRes);
    expect(ejectSystemRes.statusCode).toBe(400);
    expect(ejectSystemRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'sys-err2',
      detail: 'Missing system identifier',
    });

    const compErrorRes = { json: jest.fn(), statusCode: 200 };
    await injectComponentHandler?.({ body: { messageId: 'comp-err' } }, compErrorRes);
    expect(compErrorRes.statusCode).toBe(400);
    expect(compErrorRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'comp-err',
      detail: 'Missing component descriptor',
    });

    const ejectComponentRes = { json: jest.fn(), statusCode: 200 };
    ejectComponentHandler?.({ body: { messageId: 'comp-err2' } }, ejectComponentRes);
    expect(ejectComponentRes.statusCode).toBe(400);
    expect(ejectComponentRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'comp-err2',
      detail: 'Missing component identifier',
    });
  });

  it('returns error when systemId not found during eject', () => {
    const { router, routes } = createRouter();
    const deps = createDeps();
    (deps.player.ejectSystem as jest.Mock).mockReturnValueOnce(false);

    registerEvaluationRoutes(router, deps);

    const handler = routes.get('/evaluation/system/eject');
    const res = { json: jest.fn(), statusCode: 200 };
    handler?.({ body: { messageId: 'missing', systemId: 'system-missing' } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'missing',
      detail: 'System not found',
    });

    (deps.player.ejectSystem as jest.Mock).mockReturnValueOnce(false);
    const aliasHandler = routes.get('/evaluation/system/:systemId');
    const aliasRes = { json: jest.fn(), statusCode: 200 };
    aliasHandler?.({ params: { systemId: 'missing' }, body: { messageId: 'missing-alias' } }, aliasRes);
    expect(aliasRes.statusCode).toBe(404);
    expect(aliasRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: 'missing-alias',
      detail: 'System not found',
    });
  });

  it('emits heartbeat comments on evaluation stream, replays last message, and stops after disconnect', () => {
    jest.useFakeTimers({ advanceTimers: true });

    const { router, routes } = createRouter();
    const deps = createDeps();

    registerEvaluationRoutes(router, deps);

    const lastPublished = deps.subscriptionCallbacks[0];
    lastPublished?.({ tick: 7, entities: {} } as Frame);

    const streamHandler = routes.get('/evaluation/stream');
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
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('"tick":7'));

    jest.advanceTimersByTime(15000);
    expect(res.write).toHaveBeenCalledWith(':heartbeat\n\n');

    const initial = writes.length;
    listeners.get('close')?.();
    const streamUnsubscribe = deps.unsubscribeMocks[deps.unsubscribeMocks.length - 1];
    expect(streamUnsubscribe).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();

    jest.advanceTimersByTime(15000);
    expect(writes.length).toBe(initial);

    jest.useRealTimers();
  });
});
