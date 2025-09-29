import http from 'node:http';
import { AddressInfo } from 'node:net';
import { createEnvironment, SimEvalEnvironment } from './environment';
import { createSSEHandler } from './sse';
import { readJsonBody, sendJson, badRequest, methodNotAllowed, notFound, internalError } from './utils';
import { Frame } from '../core/messaging/Frame';

interface DispatchableEnvironment extends SimEvalEnvironment {
  dispatchSimulation: (type: string) => Promise<unknown>;
  dispatchEvaluation: (type: string, data?: unknown) => Promise<unknown>;
}

function withDispatchers(env: SimEvalEnvironment): DispatchableEnvironment {
  let counter = 0;
  const nextId = () => `${Date.now()}-${counter++}`;

  const dispatchSimulation = async (type: string) =>
    env.simulation.registry.dispatch({
      player: env.simulation,
      message: { id: nextId(), type }
    });

  const dispatchEvaluation = async (type: string, data?: unknown) =>
    env.evaluation.registry.dispatch({
      player: env.evaluation,
      message: { id: nextId(), type, data }
    });

  return { ...env, dispatchSimulation, dispatchEvaluation };
}

export interface RouteResponse {
  status: number;
  payload?: unknown;
}

export async function handleRoute(
  env: DispatchableEnvironment,
  method: string,
  path: string,
  body?: unknown
): Promise<RouteResponse> {
  if (path === '/info') {
    if (method !== 'GET') {
      return { status: 405, payload: { error: 'Method Not Allowed' } };
    }

    return {
      status: 200,
      payload: {
        simulation: {
          controls: ['/simulation/start', '/simulation/pause', '/simulation/stop'],
          systemInjection: '/simulation/systems',
          events: '/simulation/events'
        },
        evaluation: {
          inject: '/evaluation/inject-frame',
          systemInjection: '/evaluation/systems',
          frames: '/evaluation/frames',
          events: '/evaluation/events'
        }
      }
    };
  }

  if (method === 'POST' && path === '/simulation/start') {
    const ack = await env.dispatchSimulation('start');
    return { status: 200, payload: ack };
  }

  if (method === 'POST' && path === '/simulation/pause') {
    const ack = await env.dispatchSimulation('pause');
    return { status: 200, payload: ack };
  }

  if (method === 'POST' && path === '/simulation/stop') {
    const ack = await env.dispatchSimulation('stop');
    return { status: 200, payload: ack };
  }

  if (method === 'POST' && path === '/simulation/systems') {
    const { systemId, componentId } = (body as { systemId?: string; componentId?: string } | undefined) ?? {};
    const registration = env.registerSimulationSystem({
      systemId: systemId ?? '',
      componentId: componentId ?? ''
    });
    return { status: 200, payload: registration };
  }

  if (method === 'POST' && path === '/evaluation/inject-frame') {
    const frame = (body as { frame?: Frame } | undefined)?.frame;
    if (!frame) {
      return { status: 400, payload: { error: 'frame payload required' } };
    }

    const ack = await env.dispatchEvaluation('inject-frame', frame);
    return { status: 200, payload: ack };
  }

  if (method === 'POST' && path === '/evaluation/systems') {
    const { systemId, componentId } = (body as { systemId?: string; componentId?: string } | undefined) ?? {};
    const registration = env.registerEvaluationSystem({
      systemId: systemId ?? '',
      componentId: componentId ?? ''
    });
    return { status: 200, payload: registration };
  }

  if (method === 'GET' && path === '/evaluation/frames') {
    const entities = env.evaluation.componentManager.getEntitiesWith(env.evaluation.frameComponent);
    const frames = entities.map((entity) => {
      const component = env.evaluation.componentManager.getComponent(entity, env.evaluation.frameComponent);
      return component?.data ?? null;
    }).filter((value): value is NonNullable<typeof value> => value !== null);

    return { status: 200, payload: { frames } };
  }

  return { status: 404, payload: { error: 'Not Found' } };
}

export interface SimEvalServer {
  server: http.Server;
  environment: SimEvalEnvironment;
  close: () => Promise<void>;
  port?: number;
}

export function createSimEvalServer(): SimEvalServer {
  const environment = createEnvironment();
  const envWithDispatch = withDispatchers(environment);

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      notFound(res);
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    try {
      if (url.pathname === '/simulation/events') {
        if (req.method !== 'GET') {
          methodNotAllowed(res);
          return;
        }
        createSSEHandler(environment.simulation.outboundBus)(req, res);
        return;
      }

      if (url.pathname === '/evaluation/events') {
        if (req.method !== 'GET') {
          methodNotAllowed(res);
          return;
        }
        createSSEHandler(environment.evaluation.outboundBus)(req, res);
        return;
      }

      const body = req.method === 'POST' ? await readJsonBody(req).catch((error) => {
        badRequest(res, error instanceof Error ? error.message : String(error));
        return undefined;
      }) : undefined;
      if (res.writableEnded) {
        return;
      }

      const result = await handleRoute(envWithDispatch, req.method ?? 'GET', url.pathname, body);
      sendJson(res, result.status, result.payload ?? {});
    } catch (error) {
      internalError(res, error);
    }
  });

  return {
    server,
    environment,
    async close() {
      environment.teardown();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
    get port() {
      const address = server.address() as AddressInfo | null;
      return address?.port;
    }
  };
}
