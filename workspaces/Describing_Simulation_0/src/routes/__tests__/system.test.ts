import { registerSystemRoutes } from '../system';
import type { Router } from '../router';
import type { PlayerStatus } from '@simeval/ecs';

describe('system routes', () => {
  const createRouter = () => {
    const map = new Map<string, (req: any, res: any) => void>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => void) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };
    return { router, map };
  };

  const createStatusProvider = (status: PlayerStatus) => ({
    describe: jest.fn(() => status),
  });

  it('exposes health metadata', () => {
    const { router, map } = createRouter();
    const deps = {
      getUptimeMs: jest.fn(() => 12345),
      version: '1.2.3',
      simulation: createStatusProvider({ state: 'idle', tick: 0, systemCount: 0 }),
      evaluation: createStatusProvider({ state: 'idle', tick: 0, systemCount: 0 }),
    };

    registerSystemRoutes(router, deps);

    const handler = map.get('/health');
    const res = { json: jest.fn() };
    handler?.({}, res);

    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      version: '1.2.3',
      ready: true,
      uptimeMs: 12345,
      timestamp: expect.any(String),
    });
  });

  it('reports simulation and evaluation status', () => {
    const { router, map } = createRouter();
    const simulation = createStatusProvider({ state: 'running', tick: 42, systemCount: 2 });
    const evaluation = createStatusProvider({ state: 'paused', tick: 10, systemCount: 1 });
    const deps = {
      getUptimeMs: jest.fn(() => 1000),
      version: '1.0.0',
      simulation,
      evaluation,
    };

    registerSystemRoutes(router, deps);

    const handler = map.get('/status');
    const res = { json: jest.fn() };
    handler?.({}, res);

    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      simulation: { state: 'running', tick: 42, systemCount: 2 },
      evaluation: { state: 'paused', tick: 10, systemCount: 1 },
    });
    expect(simulation.describe).toHaveBeenCalled();
    expect(evaluation.describe).toHaveBeenCalled();
  });
});
