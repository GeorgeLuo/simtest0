import type { Router } from './router';
import type { EvaluationPlayer, FrameRecord, ConditionRecord } from '../core/evalplayer/EvaluationPlayer';
import type { Bus } from '../core/messaging/Bus';
import type { Frame } from '../core/messaging/outbound/Frame';
import type { Acknowledgement } from '../core/messaging/outbound/Acknowledgement';

type OutboundMessage = Frame | Acknowledgement;

export interface EvaluationRouteDeps {
  player: EvaluationPlayer;
  outboundBus: Bus<OutboundMessage>;
}

export function registerEvaluationRoutes(router: Router, deps: EvaluationRouteDeps): void {
  const respond = (res: any, messageId?: string) => {
    res.json?.({ status: 'success', messageId });
  };

  router.register('/evaluation/frame', (req: any, res: any) => {
    const payload = req.body as FrameRecord & { messageId?: string };
    deps.player.injectFrame(payload);
    respond(res, payload.messageId);
  });

  router.register('/evaluation/inject', (req: any, res: any) => {
    const payload = req.body as ConditionRecord & { messageId?: string };
    deps.player.registerCondition({ conditionId: payload.conditionId, definition: payload.definition });
    respond(res, payload.messageId);
  });

  router.register('/evaluation/eject', (req: any, res: any) => {
    const payload = req.body as { messageId?: string; conditionId: string };
    deps.player.removeCondition({ conditionId: payload.conditionId });
    respond(res, payload.messageId);
  });

  router.register('/evaluation/stream', (req: any, res: any) => {
    res.writeHead?.(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();

    const unsubscribe = deps.outboundBus.subscribe((message) => {
      res.write?.(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on?.('close', () => {
      unsubscribe?.();
      res.end?.();
    });
  });
}
