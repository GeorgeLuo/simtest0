import type { Bus } from '../core/messaging/Bus';
import { Router } from './router';

export interface EvaluationRouteContext {
  readonly outboundBus: Bus;
}

export function registerEvaluationRoutes(
  router: Router,
  context: EvaluationRouteContext,
): void {
  router.add('GET', '/evaluation/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(': connected\n\n');

    const unsubscribe = context.outboundBus.subscribe((frame) => {
      res.write(`data: ${JSON.stringify(frame)}\n\n`);
    });

    const cleanup = () => {
      unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
  });
}
