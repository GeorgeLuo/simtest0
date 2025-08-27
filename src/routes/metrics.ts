import { Router, Request, Response } from 'express';
import { SnapshotSystem } from '../ecs/systems/SnapshotSystem';

export default function metrics(snapshot: SnapshotSystem): Router {
  const router = Router();

  router.get('/snapshots', (_req: Request, res: Response) => {
    res.json(snapshot.getSnapshots());
  });

  return router;
}
