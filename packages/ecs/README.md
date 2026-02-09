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

## Inject systems into EvaluationPlayer

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

## Inject frames into EvaluationPlayer

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
