import type { EntityManager } from "../../entity/EntityManager";
import type { ComponentManager } from "../../components/ComponentManager";
import type { SystemManager } from "../../systems/management/SystemManager";
import type { LoopController } from "../Player";
import type { Bus } from "../../messaging/Bus";
import { IOPlayer, type CommandMessage, type OutboundEvent } from "../IOPlayer";
import type { Operation } from "../../messaging/inbound/Operation";
import type { Acknowledgement } from "../../messaging/outbound/Acknowledgement";
import type { Frame } from "../../messaging/outbound/Frame";
import type { FrameFilter } from "../../messaging/outbound/FrameFilter";
import type { InboundHandlerRegistry } from "../../messaging/inbound/InboundHandlerRegistry";
import { ComponentType } from "../../components/ComponentType";
import type { TimeSystem } from "../../systems/time/TimeSystem";
import type { TimeComponent } from "../../components/time/TimeComponent";
import type { Entity } from "../../entity/Entity";
import { createStartOperation } from "../simplayer/operations/Start";
import { createPauseOperation } from "../simplayer/operations/Pause";
import { createStopOperation } from "../simplayer/operations/Stop";
import { createInjectSystemOperation } from "../simplayer/operations/InjectSystem";
import { createEjectSystemOperation } from "../simplayer/operations/EjectSystem";
import { createInjectFrameOperation } from "./operations/InjectFrame";

interface EvaluationPlayerOptions {
  filter?: FrameFilter;
  registry?: InboundHandlerRegistry<string, IOPlayer, CommandMessage, Acknowledgement>;
}

export class EvaluationPlayer extends IOPlayer {
  #timeSystem: TimeSystem;
  #timeComponent: TimeComponent;
  #componentCache = new Map<string, ComponentType<unknown>>();

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    loop: LoopController,
    inbound: Bus<CommandMessage>,
    outbound: Bus<OutboundEvent>,
    timeSystem: TimeSystem,
    timeComponent: TimeComponent,
    options?: EvaluationPlayerOptions,
  ) {
    super(entities, components, systems, loop, inbound, outbound, options);
    this.#timeSystem = timeSystem;
    this.#timeComponent = timeComponent;
    this.#componentCache.set(timeComponent.id, timeComponent);

    this.registerOperations("start", [createStartOperation()]);
    this.registerOperations("pause", [createPauseOperation()]);
    this.registerOperations("stop", [createStopOperation()]);
    this.registerOperations("inject", [createInjectSystemOperation()]);
    this.registerOperations("eject", [createEjectSystemOperation()]);
    this.registerOperations("inject-frame", [createInjectFrameOperation()]);
  }

  registerOperations(type: string, operations: ReadonlyArray<Operation<EvaluationPlayer, CommandMessage>>): void {
    const adapted = operations.map((operation) => adaptOperation(operation));
    super.register(type, adapted);
  }

  loadFrame(frame: Frame): void {
    this.pause();
    this.componentManager.clearAll();
    this.entityManager.clear();

    let timeEntity: Entity | null = null;
    let timeTick = frame.tick ?? 0;

    for (const entityFrame of frame.entities) {
      const entity = this.entityManager.create();
      for (const [typeId, value] of Object.entries(entityFrame.components)) {
        const componentType = this.resolveComponentType(typeId);
        this.componentManager.set(entity, componentType, value);

        if (typeId === this.#timeComponent.id && typeof (value as any)?.tick === "number") {
          timeEntity = entity;
          timeTick = (value as any).tick as number;
        }
      }
    }

    if (timeEntity === null) {
      timeEntity = this.entityManager.create();
    }

    this.#timeSystem.hydrate(timeEntity, timeTick);
    this.publishFrame();
  }

  private resolveComponentType(id: string): ComponentType<unknown> {
    const cached = this.#componentCache.get(id);
    if (cached) {
      return cached;
    }
    const type = new ComponentType(id);
    this.#componentCache.set(id, type);
    return type;
  }
}

function adaptOperation(
  operation: Operation<EvaluationPlayer, CommandMessage>,
): Operation<IOPlayer, CommandMessage> {
  return {
    execute: async (context, message) => operation.execute(context as EvaluationPlayer, message),
  };
}
