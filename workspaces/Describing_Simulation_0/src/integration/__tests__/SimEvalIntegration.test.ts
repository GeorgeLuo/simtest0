import { createServer, type BootstrapOptions } from '../../server';
import type { IOPlayer, EvaluationPlayer } from '@simeval/ecs';
import { Router } from '../../routes/router';

jest.mock('../../routes/simulation', () => ({
  registerSimulationRoutes: jest.fn(),
}));
jest.mock('../../routes/evaluation', () => ({
  registerEvaluationRoutes: jest.fn(),
}));
jest.mock('../../routes/codebase', () => ({
  registerCodebaseRoutes: jest.fn(),
}));
jest.mock('../../routes/information', () => ({
  registerInformationRoutes: jest.fn(),
}));

const registerSimulationRoutes = require('../../routes/simulation').registerSimulationRoutes as jest.Mock;
const registerEvaluationRoutes = require('../../routes/evaluation').registerEvaluationRoutes as jest.Mock;
const registerCodebaseRoutes = require('../../routes/codebase').registerCodebaseRoutes as jest.Mock;
const registerInformationRoutes = require('../../routes/information').registerInformationRoutes as jest.Mock;

describe('Sim-Eval integration harness', () => {
  it('wires router routes and exposes server start/stop', async () => {
    const simulationPlayer = {
      start: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      injectSystem: jest.fn(),
      ejectSystem: jest.fn(),
      registerComponent: jest.fn(),
      removeComponent: jest.fn(),
    } as unknown as IOPlayer & {
      injectSystem: jest.Mock;
      ejectSystem: jest.Mock;
      registerComponent: jest.Mock;
      removeComponent: jest.Mock;
    };

    const evaluationPlayer = {
      injectSystem: jest.fn(),
      ejectSystem: jest.fn(),
      injectFrame: jest.fn(),
      registerComponent: jest.fn(),
      removeComponent: jest.fn(),
    } as unknown as EvaluationPlayer;

    const options: BootstrapOptions = {
      port: 0,
      simulation: {
        player: simulationPlayer,
        outboundBus: { subscribe: jest.fn(() => jest.fn()) },
        loadSystem: jest.fn(async () => ({}) as unknown as any),
        loadComponent: jest.fn(async () => ({ id: 'sim.component', validate: () => true })),
      },
      evaluation: {
        player: evaluationPlayer,
        outboundBus: { subscribe: jest.fn(() => jest.fn()) },
        loadSystem: jest.fn(async () => ({}) as unknown as any),
        loadComponent: jest.fn(async () => ({ id: 'comp', validate: () => true })),
      },
      codebase: {
        rootDir: '/repo',
        listDir: jest.fn(async () => ['file.ts']),
        readFile: jest.fn(async () => 'content'),
        writeFile: jest.fn(async () => undefined),
      },
      information: {
        segments: [
          { id: 'simulation', title: 'Simulation', description: 'desc', path: '/api/simulation' },
        ],
        documents: [
          { id: 'api', title: 'API', description: 'desc', filename: '/docs/api.md' },
        ],
        readDocument: jest.fn(async () => '# doc'),
      },
    };

    const server = createServer(options);
    expect(server).toBeTruthy();

    expect(registerSimulationRoutes).toHaveBeenCalledTimes(1);
    expect(registerEvaluationRoutes).toHaveBeenCalledTimes(1);
    expect(registerCodebaseRoutes).toHaveBeenCalledTimes(1);
    expect(registerInformationRoutes).toHaveBeenCalledTimes(1);

    const routerArg = registerSimulationRoutes.mock.calls[0]?.[0];
    expect(routerArg).toBeInstanceOf(Router);
  });
});
