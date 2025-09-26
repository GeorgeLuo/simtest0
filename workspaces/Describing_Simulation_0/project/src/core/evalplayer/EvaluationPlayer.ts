import { IOPlayer, type IOPlayerOptions, type SnapshotFrame } from '../IOPlayer';
import type { ComponentManager } from '../components/ComponentManager';
import type { EntityManager } from '../entity/EntityManager';
import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import { InboundHandlerRegistry, type FrameFilter } from '../messaging';
import { createInjectFrameOperation, type InjectFrameFrame } from './operations/InjectFrame';

export interface EvaluationPlayerOptions extends IOPlayerOptions {
  readonly injectFrameType?: string;
}

type EvaluationSnapshotMetadata = SnapshotFrame['metadata'] & {
  readonly historical?: boolean;
};

const DEFAULT_FRAME_TYPE = 'evaluation/frame';
const DEFAULT_INJECT_TYPE = 'simulation/frame';

export class EvaluationPlayer extends IOPlayer {
  private readonly registry: InboundHandlerRegistry;

  constructor(
    entities: EntityManager,
    components: ComponentManager,
    systems: SystemManager,
    inboundBus: Bus,
    outboundBus: Bus,
    options: EvaluationPlayerOptions = {},
  ) {
    const registry = new InboundHandlerRegistry();
    const { injectFrameType, frameFilter, frameType, ...playerOptions } = options;
    const resolvedFrameType = frameType ?? DEFAULT_FRAME_TYPE;
    let suppressHistorical = false;
    const userFilter = frameFilter;
    const resolvedFilter: FrameFilter<SnapshotFrame> = (frame) =>
      !suppressHistorical && (!userFilter || userFilter(frame));

    super(entities, components, systems, inboundBus, outboundBus, registry, {
      ...playerOptions,
      frameType: resolvedFrameType,
      frameFilter: resolvedFilter,
    });

    this.registry = registry;

    registry.register(
      createInjectFrameOperation(entities, components, {
        messageType: injectFrameType ?? DEFAULT_INJECT_TYPE,
        onInjected: (frame: InjectFrameFrame) => {
          const metadata = frame.metadata as EvaluationSnapshotMetadata | undefined;
          suppressHistorical = metadata?.historical === true;
        },
      }),
    );
  }

  get handlerRegistry(): InboundHandlerRegistry {
    return this.registry;
  }
}
