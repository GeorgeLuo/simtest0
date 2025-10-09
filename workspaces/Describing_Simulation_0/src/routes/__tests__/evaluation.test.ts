import { registerEvaluationRoutes } from '../evaluation';
import type { Router } from '../router';
import type { EvaluationPlayer } from '../../core/evalplayer/EvaluationPlayer';
import type { Bus } from '../../core/messaging/Bus';
import type { Frame } from '../../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../../core/messaging/outbound/Acknowledgement';

describe('evaluation routes', () => {
  it('registers evaluation endpoints and delegates to player', () => {
    const map = new Map<string, (req: any, res: any) => void>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => void) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };

    const player = {
      injectFrame: jest.fn(),
      registerCondition: jest.fn(),
      removeCondition: jest.fn(),
    } as unknown as EvaluationPlayer & {
      injectFrame: jest.Mock;
      registerCondition: jest.Mock;
      removeCondition: jest.Mock;
    };

    const outboundBus = {
      subscribe: jest.fn(() => jest.fn()),
    } as unknown as Bus<Frame | Acknowledgement> & { subscribe: jest.Mock };

    const deps = { player, outboundBus };

    expect(() => registerEvaluationRoutes(router, deps)).not.toThrow();

    const injectFrame = map.get('/evaluation/frame');
    const registerCondition = map.get('/evaluation/inject');
    const removeCondition = map.get('/evaluation/eject');

    expect(injectFrame).toBeDefined();
    expect(registerCondition).toBeDefined();
    expect(removeCondition).toBeDefined();

    const createRes = () => ({ json: jest.fn() });

    const frameRes = createRes();
    injectFrame?.({ body: { messageId: 'frame-1', frame: { tick: 1, entities: {} } } }, frameRes);
    expect(player.injectFrame).toHaveBeenCalledWith({ messageId: 'frame-1', frame: { tick: 1, entities: {} } });
    expect(frameRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'frame-1' });

    const registerRes = createRes();
    registerCondition?.({ body: { messageId: 'cond-1', conditionId: 'cond-1', definition: {} } }, registerRes);
    expect(player.registerCondition).toHaveBeenCalledWith({ conditionId: 'cond-1', definition: {} });
    expect(registerRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'cond-1' });

    const removeRes = createRes();
    removeCondition?.({ body: { messageId: 'cond-2', conditionId: 'cond-1' } }, removeRes);
    expect(player.removeCondition).toHaveBeenCalledWith({ conditionId: 'cond-1' });
    expect(removeRes.json).toHaveBeenCalledWith({ status: 'success', messageId: 'cond-2' });
  });
});
