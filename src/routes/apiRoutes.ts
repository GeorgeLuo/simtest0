import { Router } from 'express';
import { EventBus } from '../messaging/EventBus';
import { SnapshotSystem } from '../ecs/systems/SnapshotSystem';
import controls from './controls';
import metrics from './metrics';
import pluginRoutes from './plugins';

export default function apiRoutes(bus: EventBus, snapshot: SnapshotSystem): Router {
  const router = Router();
  router.use('/controls', controls(bus));
  router.use('/metrics', metrics(snapshot));
  router.use('/plugins', pluginRoutes);
  return router;
}
