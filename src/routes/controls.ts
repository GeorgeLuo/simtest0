import { Router, Request, Response } from 'express';
import { EventBus } from '../messaging/EventBus';
import { MessageType } from '../messaging/MessageTypes';

export default function controls(bus: EventBus): Router {
  const router = Router();

  router.post('/start', (_req: Request, res: Response) => {
    bus.publish(MessageType.START, undefined);
    res.sendStatus(200);
  });

  router.post('/pause', (_req: Request, res: Response) => {
    bus.publish(MessageType.PAUSE, undefined);
    res.sendStatus(200);
  });

  router.post('/stop', (_req: Request, res: Response) => {
    bus.publish(MessageType.STOP, undefined);
    res.sendStatus(200);
  });

  return router;
}
