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
      injectSystem: jest.fn(),
      ejectSystem: jest.fn(),
      registerComponent: jest.fn(),
      removeComponent: jest.fn(),
    } as unknown as EvaluationPlayer & {
      injectFrame: jest.Mock;
      injectSystem: jest.Mock;
      ejectSystem: jest.Mock;
      registerComponent: jest.Mock;
      removeComponent: jest.Mock;
    };

    const outboundBus = {
      subscribe: jest.fn(() => jest.fn()),
    } as unknown as Bus<Frame | Acknowledgement> & { subscribe: jest.Mock };

    const loadSystem = jest.fn<Promise<System>, [EvaluationSystemDescriptor]>(async () => ({} as System));
    const loadComponent = jest.fn<Promise<ComponentType<unknown>>, [EvaluationComponentDescriptor]>(
      async () => ({ id: 'component', validate: () => true }),
    );

    return { player, outboundBus, loadSystem, loadComponent };
  };

  it('registers evaluation endpoints and delegates to dependencies', async () => {
    const { router, routes } = createRouter();
    const deps = createDeps();

    registerEvaluationRoutes(router, deps);

    expect(router.register).toHaveBeenCalledTimes(6);

    const frameHandler = routes.get('/evaluation/frame');
    const injectSystemHandler = routes.get('/evaluation/system/inject');
    const ejectSystemHandler = routes.get('/evaluation/system/eject');
    const injectComponentHandler = routes.get('/evaluation/component/inject');
    const ejectComponentHandler = routes.get('/evaluation/component/eject');
    const streamHandler = routes.get('/evaluation/stream');

    expect(frameHandler).toBeDefined();
    expect(injectSystemHandler).toBeDefined();
    expect(ejectSystemHandler).toBeDefined();
    expect(injectComponentHandler).toBeDefined();
    expect(ejectComponentHandler).toBeDefined();
    expect(streamHandler).toBeDefined();

    const frameRes = { json: jest.fn() };
    frameHandler?.({ body: { messageId: 'frame-1', frame: { tick: 1, entities: {} } } }, frameRes);
    expect(deps.player.injectFrame).toHaveBeenCalledWith({ messageId: 'frame-1', frame: { tick: 1, entities: {} } });
    expect(frameRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'frame-1' });

    const systemRes = { json: jest.fn(), statusCode: 200 };
    await injectSystemHandler?.({ body: { messageId: 'sys-1', system: { modulePath: 'plugins/eval/System.js' } } }, systemRes);
    expect(deps.loadSystem).toHaveBeenCalledWith({ modulePath: 'plugins/eval/System.js' });
    expect(deps.player.injectSystem).toHaveBeenCalled();
    expect(systemRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'sys-1' });

    const ejectSystemRes = { json: jest.fn(), statusCode: 200 };
    const systemInstance = {} as System;
    ejectSystemHandler?.({ body: { messageId: 'sys-2', system: systemInstance } }, ejectSystemRes);
    expect(deps.player.ejectSystem).toHaveBeenCalledWith({ system: systemInstance });
    expect(ejectSystemRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'sys-2' });

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
      detail: 'Missing system instance',
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
});
