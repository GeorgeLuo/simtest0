import { performance } from "node:perf_hooks";
import { ComponentManager } from "../src/core/components/ComponentManager.js";
import { ComponentType } from "../src/core/components/ComponentType.js";
import { EntityManager } from "../src/core/entity/EntityManager.js";
import { Bus } from "../src/core/messaging/Bus.js";
import { InboundHandlerRegistry } from "../src/core/messaging/inbound/InboundHandlerRegistry.js";
import { IOPlayer } from "../src/core/IOPlayer.js";
import { SystemManager } from "../src/core/systems/SystemManager.js";
import { InboundMessage } from "../src/core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../src/core/messaging/outbound/OutboundMessage.js";

const ITERATIONS = Number.parseInt(process.env.ITERATIONS ?? "1000", 10);
const ENTITY_COUNT = Number.parseInt(process.env.ENTITIES ?? "500", 10);
const COMPONENTS_PER_ENTITY = Number.parseInt(process.env.COMPONENTS ?? "5", 10);

function createPlayer(): IOPlayer {
  const componentManager = new ComponentManager();
  const entityManager = new EntityManager(componentManager);
  const systemManager = new SystemManager();
  const inboundBus = new Bus<InboundMessage>();
  const outboundBus = new Bus<OutboundMessage>();
  const registry = new InboundHandlerRegistry();

  const player = new IOPlayer({
    componentManager,
    entityManager,
    systemManager,
    inboundBus,
    outboundBus,
    inboundRegistry: registry,
  });

  const componentTypes: ComponentType<Record<string, number>>[] = [];
  for (let index = 0; index < COMPONENTS_PER_ENTITY; index += 1) {
    componentTypes.push(new ComponentType(`benchmark.component.${index}`));
  }

  for (let entityIndex = 0; entityIndex < ENTITY_COUNT; entityIndex += 1) {
    const entity = entityManager.createEntity();
    for (const componentType of componentTypes) {
      componentManager.addComponent(entity, componentType, { value: entityIndex });
    }
  }

  return player;
}

const player = createPlayer();

const start = performance.now();
for (let index = 0; index < ITERATIONS; index += 1) {
  player.step();
}
const durationMs = performance.now() - start;
const framesPerSecond = (ITERATIONS / durationMs) * 1000;

console.log(
  JSON.stringify(
    {
      iterations: ITERATIONS,
      entities: ENTITY_COUNT,
      componentsPerEntity: COMPONENTS_PER_ENTITY,
      durationMs,
      framesPerSecond,
    },
    null,
    2,
  ),
);
