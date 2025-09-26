import { IOPlayer, type IOPlayerOptions, type SnapshotFrame } from '../IOPlayer';
import type { ComponentManager } from '../components/ComponentManager';
import type { EntityManager } from '../entity/EntityManager';
import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import { InboundHandlerRegistry, matchType } from '../messaging';
import { createStartOperation } from './operations/Start';
import { createPauseOperation } from './operations/Pause';
import { createStopOperation } from './operations/Stop';
import { createInjectSystemOperation } from './operations/InjectSystem';

export interface SimulationPlayerCommandTypes {
  readonly start: string;
  readonly pause: string;
  readonly stop: string;
  readonly injectSystem: string;
}

export interface SimulationPlayerOptions extends IOPlayerOptions {
  readonly commandTypes?: Partial<SimulationPlayerCommandTypes>;
}

const DEFAULT_FRAME_TYPE = 'simulation/frame';

const DEFAULT_COMMAND_TYPES: SimulationPlayerCommandTypes = {
  start: 'simulation/start',
  pause: 'simulation/pause',
  stop: 'simulation/stop',
  injectSystem: 'simulation/system.inject',
};

export class SimulationPlayer extends IOPlayer {
  private readonly registry: InboundHandlerRegistry;
  private readonly commandTypes: SimulationPlayerCommandTypes;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    inboundBus: Bus,
    outboundBus: Bus,
    options: SimulationPlayerOptions = {},
  ) {
    const registry = new InboundHandlerRegistry();
    const { commandTypes, frameFilter, frameType, ...playerOptions } = options;

    const resolvedCommandTypes: SimulationPlayerCommandTypes = {
      ...DEFAULT_COMMAND_TYPES,
      ...(commandTypes ?? {}),
    };

    const resolvedFrameType = frameType ?? DEFAULT_FRAME_TYPE;
    const resolvedFrameFilter =
      frameFilter ?? matchType<SnapshotFrame>(resolvedFrameType);

    super(entities, components, systems, inboundBus, outboundBus, registry, {
      ...playerOptions,
      frameType: resolvedFrameType,
      frameFilter: resolvedFrameFilter,
    });

    this.registry = registry;
    this.commandTypes = resolvedCommandTypes;

    this.registerOperations(systems);
  }

  /** Returns the registry managing inbound command handlers. */
  get commandRegistry(): InboundHandlerRegistry {
    return this.registry;
  }

  /** Returns the configured message types for built-in commands. */
  get commands(): SimulationPlayerCommandTypes {
    return this.commandTypes;
  }

  private registerOperations(systems: SystemManager): void {
    this.registry.register(
      createStartOperation(this, { messageType: this.commandTypes.start }),
    );

    this.registry.register(
      createPauseOperation(this, { messageType: this.commandTypes.pause }),
    );

    this.registry.register(
      createStopOperation(this, { messageType: this.commandTypes.stop }),
    );

    this.registry.register(
      createInjectSystemOperation(systems, {
        messageType: this.commandTypes.injectSystem,
      }),
    );
  }
}
