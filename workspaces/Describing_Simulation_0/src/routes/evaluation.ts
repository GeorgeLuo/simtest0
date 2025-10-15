import type { Router } from './router';
import type { EvaluationPlayer, FrameRecord } from '../core/evalplayer/EvaluationPlayer';
import type { Bus } from '../core/messaging/Bus';
import type { Frame } from '../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../core/messaging/outbound/Acknowledgement';
import type { System } from '../core/systems/System';
import type { ComponentType } from '../core/components/ComponentType';

type OutboundMessage = Frame | Acknowledgement;

export interface EvaluationSystemDescriptor {
  modulePath: string;
  exportName?: string;
}

export interface EvaluationComponentDescriptor {
  modulePath: string;
  exportName?: string;
}

type ControllableEvaluationPlayer = EvaluationPlayer & {
  injectSystem: (payload: { system: System }) => string;
  ejectSystem: (payload: { system?: System; systemId?: string }) => boolean;
};

export interface EvaluationRouteDeps {
  player: ControllableEvaluationPlayer;
  outboundBus: Bus<OutboundMessage>;
  loadSystem: (descriptor: EvaluationSystemDescriptor) => Promise<System>;
  loadComponent: (descriptor: EvaluationComponentDescriptor) => Promise<ComponentType<unknown>>;
}

export function registerEvaluationRoutes(router: Router, deps: EvaluationRouteDeps): void {
  const respondSuccess = (res: any, messageId?: string, extras: Record<string, unknown> = {}) => {
    res.json?.({ status: 'success', messageId, ...extras });
  };

  const respondError = (res: any, messageId: string | undefined, detail: string, status = 400) => {
    res.statusCode = status;
    res.json?.({ status: 'error', messageId, detail });
  };

  router.register('/evaluation/frame', (req: any, res: any) => {
    const payload = req.body as FrameRecord & { messageId?: string };
    deps.player.injectFrame(payload);
    respondSuccess(res, payload.messageId);
  });

  router.register('/evaluation/system/inject', async (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const descriptor = req.body?.system as EvaluationSystemDescriptor | undefined;

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

  router.register('/evaluation/system/eject', (req: any, res: any) => {
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

  router.register('/evaluation/component/inject', async (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const descriptor = req.body?.component as EvaluationComponentDescriptor | undefined;

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
  });

  router.register('/evaluation/component/eject', (req: any, res: any) => {
    const messageId = req.body?.messageId as string | undefined;
    const componentId = req.body?.componentId as string | undefined;

    if (!componentId) {
      respondError(res, messageId, 'Missing component identifier');
      return;
    }

    deps.player.removeComponent(componentId);
    respondSuccess(res, messageId);
  });

  router.register('/evaluation/stream', (req: any, res: any) => {
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
