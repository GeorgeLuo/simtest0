import type { Router } from './router';
import type { IOPlayer, Bus, Frame, Acknowledgement, System, ComponentType } from '@georgeluo/ecs';

type OutboundMessage = Frame | Acknowledgement;
const SSE_CONNECTED_CHUNK = ':connected\n\n';
const SSE_HEARTBEAT_CHUNK = ':heartbeat\n\n';
const SSE_SERIALIZATION_CACHE = new WeakMap<OutboundMessage, string>();

type ControllableIOPlayer = Pick<IOPlayer, 'start' | 'pause' | 'stop'> & {
  injectSystem: (payload: { system: System }) => string;
  ejectSystem: (payload: { system?: System; systemId?: string }) => boolean;
  registerComponent: (component: ComponentType<unknown>) => void;
  removeComponent: (componentId: string) => boolean;
};

export interface SimulationRouteDeps {
  player: ControllableIOPlayer;
  outboundBus: Bus<OutboundMessage>;
  loadSystem: (descriptor: SimulationSystemDescriptor) => Promise<System>;
  loadComponent: (descriptor: SimulationComponentDescriptor) => Promise<ComponentType<unknown>>;
}

export interface SimulationSystemDescriptor {
  modulePath: string;
  exportName?: string;
}

export interface SimulationComponentDescriptor {
  modulePath: string;
  exportName?: string;
}

export function registerSimulationRoutes(router: Router, deps: SimulationRouteDeps): void {
  const respondSuccess = (res: any, messageId?: string, extras: Record<string, unknown> = {}) => {
    res.json?.({ status: 'success', messageId, ...extras });
  };

  const respondError = (res: any, messageId: string | undefined, detail: string, status = 400) => {
    res.statusCode = status;
    res.json?.({ status: 'error', messageId, detail });
  };

  let latestMessage: OutboundMessage | null = null;
  deps.outboundBus.subscribe((message) => {
    latestMessage = message;
  });

  router.register('/simulation/start', (req: any, res: any) => {
    deps.player.start();
    respondSuccess(res, req.body?.messageId);
  });

  router.register('/simulation/pause', (req: any, res: any) => {
    deps.player.pause();
    respondSuccess(res, req.body?.messageId);
  });

  router.register('/simulation/stop', (req: any, res: any) => {
    deps.player.stop();
    respondSuccess(res, req.body?.messageId);
  });

  const registerPaths = (paths: string[], handler: (req: any, res: any) => void) => {
    for (const path of paths) {
      router.register(path, handler);
    }
  };

  const resolveIdentifier = (req: any, key: string): string | undefined => {
    const fromBody = typeof req.body?.[key] === 'string' ? req.body[key] : undefined;
    const fromParams = typeof req.params?.[key] === 'string' ? req.params[key] : undefined;
    const fromQuery = typeof req.query?.[key] === 'string' ? req.query[key] : undefined;
    return fromBody ?? fromParams ?? fromQuery;
  };

  const injectSystemHandler = async (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const descriptor = req.body?.system as SimulationSystemDescriptor | undefined;

    if (!descriptor?.modulePath) {
      respondError(res, messageId, 'Missing system descriptor');
      return;
    }

    try {
      const system = await deps.loadSystem(descriptor);
      const systemId = deps.player.injectSystem({ system });
      respondSuccess(res, messageId, { systemId });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'System injection failed';
      respondError(res, messageId, detail);
    }
  };

  registerPaths(['/simulation/inject', '/simulation/system'], injectSystemHandler);

  const ejectSystemHandler = (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const systemId = resolveIdentifier(req, 'systemId');
    if (!systemId) {
      respondError(res, messageId, 'Missing system identifier');
      return;
    }

    const removed = deps.player.ejectSystem({ systemId });
    if (!removed) {
      respondError(res, messageId, 'System not found', 404);
      return;
    }

    respondSuccess(res, messageId, { systemId });
  };

  registerPaths(['/simulation/eject', '/simulation/system/:systemId'], ejectSystemHandler);

  const injectComponentHandler = async (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const descriptor = req.body?.component as SimulationComponentDescriptor | undefined;

    if (!descriptor?.modulePath) {
      respondError(res, messageId, 'Missing component descriptor');
      return;
    }

    try {
      const component = await deps.loadComponent(descriptor);
      deps.player.registerComponent(component);
      respondSuccess(res, messageId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Component injection failed';
      respondError(res, messageId, detail);
    }
  };

  registerPaths(['/simulation/component/inject', '/simulation/component'], injectComponentHandler);

  const ejectComponentHandler = (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const componentId = resolveIdentifier(req, 'componentId');

    if (!componentId) {
      respondError(res, messageId, 'Missing component identifier');
      return;
    }

    deps.player.removeComponent(componentId);
    respondSuccess(res, messageId);
  };

  registerPaths(['/simulation/component/eject', '/simulation/component/:componentId'], ejectComponentHandler);

  router.register('/simulation/stream', (req: any, res: any) => {
    res.writeHead?.(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();
    res.write?.(SSE_CONNECTED_CHUNK);

    if (latestMessage) {
      writeSseMessage(res, latestMessage);
    }

    const heartbeatInterval = setInterval(() => {
      res.write?.(SSE_HEARTBEAT_CHUNK);
    }, 15000);

    const unsubscribe = deps.outboundBus.subscribe((message) => {
      writeSseMessage(res, message);
    });

    req.on?.('close', () => {
      unsubscribe?.();
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      res.end?.();
    });
  });
}

function writeSseMessage(res: any, message: OutboundMessage): void {
  let serialized = SSE_SERIALIZATION_CACHE.get(message);
  if (!serialized) {
    serialized = `data: ${JSON.stringify(message)}\n\n`;
    SSE_SERIALIZATION_CACHE.set(message, serialized);
  }
  res.write?.(serialized);
}
