import { IncomingMessage, ServerResponse } from 'node:http';
import { Bus } from '../core/messaging/Bus.js';

export function createSSEHandler<T>(bus: Bus<T>, serialize: (payload: T) => string = JSON.stringify) {
  return (_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    res.write(': connected\n\n');

    const unsubscribe = bus.subscribe((payload) => {
      try {
        res.write(`data: ${serialize(payload)}\n\n`);
      } catch (error) {
        unsubscribe();
        res.end();
      }
    });

    res.on('close', () => {
      unsubscribe();
    });
  };
}
