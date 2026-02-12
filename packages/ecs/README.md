# @georgeluo/ecs

Reusable ECS core extracted from `workspaces/Describing_Simulation_0/src/core`.

## Monorepo Layout

- Canonical ECS implementation lives in `packages/ecs/src`.
- The SimEval workspace keeps `workspaces/Describing_Simulation_0/src/core/**` as compatibility shims that re-export this package.
- This keeps historical/spec path layout without duplicating implementation logic.

## Install

```bash
npm install @georgeluo/ecs
```

```bash
pnpm add @georgeluo/ecs
```

```bash
yarn add @georgeluo/ecs
```

For this monorepo before publish, use a local file dependency:

```json
{
  "dependencies": {
    "@georgeluo/ecs": "file:../../packages/ecs"
  }
}
```

## Import

```ts
import {
  EntityManager,
  ComponentManager,
  SystemManager,
  SimulationPlayer,
  EvaluationPlayer,
  Bus,
  FrameFilter,
  SimulationMessageType,
  EvaluationMessageType,
  type Frame,
  type Acknowledgement,
  type System,
} from '@georgeluo/ecs';
```

## Quick Start (SimulationPlayer)

```ts
import {
  EntityManager,
  ComponentManager,
  SystemManager,
  SimulationPlayer,
  Bus,
  FrameFilter,
  TimeSystem,
  type Frame,
  type Acknowledgement,
} from '@georgeluo/ecs';

const entities = new EntityManager();
const components = new ComponentManager();
const systems = new SystemManager(entities, components);
const inbound = new Bus<unknown>();
const outbound = new Bus<Frame | Acknowledgement>();
const player = new SimulationPlayer(systems, inbound, outbound, new FrameFilter());

const systemId = player.injectSystem({ system: new TimeSystem() });
outbound.subscribe((message) => {
  console.log('outbound:', message);
});

player.start();
setTimeout(() => player.pause(), 200);
setTimeout(() => player.stop(), 500);
setTimeout(() => player.ejectSystem({ systemId }), 800);
```

## Control Simulation via Inbound Bus

```ts
import { SimulationMessageType } from '@georgeluo/ecs';

inbound.publish({ type: SimulationMessageType.START, payload: { messageId: 'm-1' } });
inbound.publish({ type: SimulationMessageType.PAUSE, payload: { messageId: 'm-2' } });
inbound.publish({ type: SimulationMessageType.STOP, payload: { messageId: 'm-3' } });
```

## Custom Component + System

```ts
import { System, type SystemContext, type ComponentType } from '@georgeluo/ecs';

const TemperatureComponent: ComponentType<{ value: number }> = {
  id: 'temperature',
  validate: (payload) => Number.isFinite(payload?.value),
};

class TemperatureSystem extends System {
  private entity: number | null = null;

  initialize(context: SystemContext): void {
    this.entity = context.entityManager.create();
    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: 72 });
  }

  update(context: SystemContext): void {
    if (this.entity === null) {
      return;
    }
    const current = context.componentManager.getComponent(this.entity, TemperatureComponent);
    const nextValue = (current?.payload.value ?? 72) + 0.25;
    context.componentManager.addComponent(this.entity, TemperatureComponent, { value: nextValue });
  }
}

player.injectSystem({ system: new TemperatureSystem() });
```

## EvaluationPlayer: Inject Systems

```ts
const entities = new EntityManager();
const components = new ComponentManager();
const systems = new SystemManager(entities, components);
const inbound = new Bus<unknown>();
const outbound = new Bus<Frame | Acknowledgement>();
const player = new EvaluationPlayer(systems, inbound, outbound, new FrameFilter());

const systemId = player.injectSystem({ system: myEvaluationSystem });
player.ejectSystem({ systemId });
```

## EvaluationPlayer: Inject Frames

```ts
inbound.publish({
  type: EvaluationMessageType.INJECT_FRAME,
  payload: {
    messageId: 'frame-1',
    frame: { tick: 1, entities: {} },
  },
});
```

Or call directly:

```ts
player.injectFrame({
  messageId: 'frame-1',
  frame: { tick: 1, entities: {} },
});
```

## API Surface

- Managers:
  - `EntityManager`, `ComponentManager`, `SystemManager`
- Players:
  - `Player`, `IOPlayer`, `SimulationPlayer`, `EvaluationPlayer`
- Base model:
  - `System`, `SystemContext`, `ComponentType`, `Frame`, `Acknowledgement`
- Messaging:
  - `Bus`, `FrameFilter`, `SimulationMessageType`, `EvaluationMessageType`
