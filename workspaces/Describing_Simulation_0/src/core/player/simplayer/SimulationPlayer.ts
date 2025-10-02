import type { EntityManager } from "../../entity/EntityManager";
import type { ComponentManager } from "../../components/ComponentManager";
import type { SystemManager } from "../../systems/management/SystemManager";
import type { LoopController } from "../Player";
import type { Bus } from "../../messaging/Bus";
import { IOPlayer, type CommandMessage, type OutboundEvent } from "../IOPlayer";
import type { Operation } from "../../messaging/inbound/Operation";
import { createStartOperation } from "./operations/Start";
import { createPauseOperation } from "./operations/Pause";
import { createStopOperation } from "./operations/Stop";
import { createInjectSystemOperation } from "./operations/InjectSystem";
import { createEjectSystemOperation } from "./operations/EjectSystem";
import type { Acknowledgement } from "../../messaging/outbound/Acknowledgement";
import type { FrameFilter } from "../../messaging/outbound/FrameFilter";
import type { InboundHandlerRegistry } from "../../messaging/inbound/InboundHandlerRegistry";

interface SimulationPlayerOptions {
  filter?: FrameFilter;
  registry?: InboundHandlerRegistry<string, IOPlayer, CommandMessage, Acknowledgement>;
}

export class SimulationPlayer extends IOPlayer {
  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    loop: LoopController,
    inbound: Bus<CommandMessage>,
    outbound: Bus<OutboundEvent>,
    options?: SimulationPlayerOptions,
  ) {
    super(entities, components, systems, loop, inbound, outbound, options);

    this.registerOperations("start", [createStartOperation()]);
    this.registerOperations("pause", [createPauseOperation()]);
    this.registerOperations("stop", [createStopOperation()]);
    this.registerOperations("inject", [createInjectSystemOperation()]);
    this.registerOperations("eject", [createEjectSystemOperation()]);
  }

  registerOperations(type: string, operations: ReadonlyArray<Operation<SimulationPlayer, CommandMessage>>): void {
    const adapted = operations.map((operation) => adaptOperation(operation));
    super.register(type, adapted);
  }
}

function adaptOperation(
  operation: Operation<SimulationPlayer, CommandMessage>,
): Operation<IOPlayer, CommandMessage> {
  return {
    execute: async (context, message) => operation.execute(context as SimulationPlayer, message),
  };
}
