import createServer from './server';
import { ECS } from './ecs/ECS';
import { SnapshotSystem } from './ecs/systems/SnapshotSystem';
import { ConditionSystem } from './ecs/systems/ConditionSystem';
import { EventBus } from './messaging/EventBus';
import { MessageType } from './messaging/MessageTypes';

const bus = new EventBus();
const ecs = new ECS();
const snapshotSystem = new SnapshotSystem(ecs.components);

ecs.addSystem(snapshotSystem);
ecs.addSystem(new ConditionSystem(() => false));

bus.subscribe(MessageType.START, () => ecs.run());
bus.subscribe(MessageType.PAUSE, () => ecs.stop());
bus.subscribe(MessageType.STOP, () => ecs.stop());

const app = createServer(bus, snapshotSystem);
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
