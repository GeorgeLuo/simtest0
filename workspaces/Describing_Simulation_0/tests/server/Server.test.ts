import { afterAll, describe, expect, it } from 'vitest';
import { createEnvironment } from '../../src/server/environment';
import { handleRoute } from '../../src/server/server';
import { Frame } from '../../src/core/messaging/Frame';

const environment = createEnvironment();
let counter = 0;
const nextId = () => `${Date.now()}-${counter++}`;

const envWithDispatch = {
  ...environment,
  dispatchSimulation: (type: string) =>
    environment.simulation.registry.dispatch({
      player: environment.simulation,
      message: { id: nextId(), type }
    }),
  dispatchEvaluation: (type: string, data?: unknown) =>
    environment.evaluation.registry.dispatch({
      player: environment.evaluation,
      message: { id: nextId(), type, data }
    })
};

afterAll(() => {
  environment.teardown();
});

describe('Server routes', () => {
  it('returns info payload', async () => {
    const result = await handleRoute(envWithDispatch, 'GET', '/info');
    expect(result.status).toBe(200);
    const payload = result.payload as { simulation: { controls: string[] } };
    expect(payload.simulation.controls).toContain('/simulation/start');
  });

  it('handles playback controls', async () => {
    const start = await handleRoute(envWithDispatch, 'POST', '/simulation/start');
    expect((start.payload as any).success).toBe(true);

    const pause = await handleRoute(envWithDispatch, 'POST', '/simulation/pause');
    expect((pause.payload as any).payload.state).toBe('paused');

    const stop = await handleRoute(envWithDispatch, 'POST', '/simulation/stop');
    expect((stop.payload as any).payload.state).toBe('idle');
  });

  it('injects simulation systems via api', async () => {
    const response = await handleRoute(envWithDispatch, 'POST', '/simulation/systems', {
      systemId: 'integration-sim',
      componentId: 'simulation.metric'
    });

    expect(response.status).toBe(200);
    expect((response.payload as any).componentId).toBe('simulation.metric');
  });

  it('rejects injection without frame', async () => {
    const response = await handleRoute(envWithDispatch, 'POST', '/evaluation/inject-frame');
    expect(response.status).toBe(400);
  });

  it('stores frames through evaluation injection', async () => {
    const frame: Frame = {
      tick: 3,
      entities: { 1: { metric: { value: 5 } } }
    };

    const response = await handleRoute(envWithDispatch, 'POST', '/evaluation/inject-frame', { frame });
    expect(response.status).toBe(200);
    expect((response.payload as any).success).toBe(true);

    const entities = environment.evaluation.componentManager.getEntitiesWith(environment.evaluation.frameComponent);
    expect(entities.length).toBeGreaterThan(0);
  });

  it('registers evaluation systems via api', async () => {
    const response = await handleRoute(envWithDispatch, 'POST', '/evaluation/systems', {
      systemId: 'integration-eval',
      componentId: 'evaluation.metric'
    });

    expect(response.status).toBe(200);
    expect((response.payload as any).componentId).toBe('evaluation.metric');
  });

  it('lists stored frames via evaluation endpoint', async () => {
    const result = await handleRoute(envWithDispatch, 'GET', '/evaluation/frames');
    expect(result.status).toBe(200);
    const frames = (result.payload as any).frames as Array<{ storedAt: number }>;
    expect(Array.isArray(frames)).toBe(true);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].storedAt).toBeGreaterThan(0);
  });
});
