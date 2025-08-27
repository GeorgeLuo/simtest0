import express from 'express';
import apiRoutes from './routes/apiRoutes';
import { EventBus } from './messaging/EventBus';
import { SnapshotSystem } from './ecs/systems/SnapshotSystem';

export default function createServer(bus: EventBus, snapshot: SnapshotSystem) {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes(bus, snapshot));
  return app;
}
