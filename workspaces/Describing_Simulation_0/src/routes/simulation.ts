import type { Router } from './router';
import type { IOPlayer } from '../core/IOPlayer';
import type { Bus } from '../core/messaging/Bus';
import type { Frame } from '../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../core/messaging/outbound/Acknowledgement';
import type { System } from '../core/systems/System';

type OutboundMessage = Frame | Acknowledgement;

type ControllableIOPlayer = Pick<IOPlayer, 'start' | 'pause' | 'stop'> & {
  injectSystem: (payload: { system: System }) => string;
  ejectSystem: (payload: { system?: System; systemId?: string }) => boolean;
};

export interface SimulationRouteDeps {
  player: ControllableIOPlayer;
  outboundBus: Bus<OutboundMessage>;
  loadSystem: (descriptor: SimulationSystemDescriptor) => Promise<System>;
}

export interface SimulationSystemDescriptor {
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

  router.register('/simulation/inject', async (req: any, res: any) => {
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
  });

  router.register('/simulation/eject', (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const systemId = typeof req.body?.systemId === 'string' ? req.body.systemId : undefined;
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
  });

  router.register('/simulation/stream', (req: any, res: any) => {
    res.writeHead?.(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();

    const heartbeatInterval = setInterval(() => {
      res.write?.(':heartbeat\n\n');
    }, 15000);

    const unsubscribe = deps.outboundBus.subscribe((message) => {
      res.write?.(`data: ${JSON.stringify(message)}\n\n`);
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
