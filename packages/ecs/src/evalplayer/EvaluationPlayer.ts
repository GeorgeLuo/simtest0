import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import type { Frame } from '../messaging/outbound/Frame';
import type { Acknowledgement } from '../messaging/outbound/Acknowledgement';
import type { FrameFilter } from '../messaging/outbound/FrameFilter';
import type { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import type { ComponentType } from '../components/ComponentType';
import { MessageHandler } from '../messaging/inbound/MessageHandler';
import { IOPlayer } from '../IOPlayer';
import { InjectFrame, type InjectFramePayload } from './operations/InjectFrame';

export interface FrameRecord {
  messageId?: string;
  frame: Frame;
}

export const EvaluationMessageType = {
  INJECT_FRAME: 'inject-frame',
} as const;

const FrameComponent: ComponentType<Frame> = {
  id: 'evaluation.frame',
  description: 'Stores a raw simulation frame for downstream evaluation systems.',
  validate(payload: Frame): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const { tick, entities } = payload;
    const entitiesIsRecord = typeof entities === 'object' && entities !== null;
    return Number.isFinite(tick) && tick >= 0 && entitiesIsRecord;
  },
};

export class EvaluationPlayer extends IOPlayer {
  protected readonly frames: FrameRecord[] = [];
  private readonly componentTypes = new Map<string, ComponentType<unknown>>();
  private readonly frameComponentType: ComponentType<Frame> = FrameComponent;
  private lastFrameTick: number | null = null;

  constructor(
    systemManager: SystemManager,
    inbound: Bus<unknown>,
    outbound: Bus<Frame | Acknowledgement>,
    frameFilter: FrameFilter,
    handlers?: InboundHandlerRegistry<EvaluationPlayer>,
    cycleIntervalMs?: number,
  ) {
    super(
      systemManager,
      inbound,
      outbound,
      frameFilter,
      (handlers as unknown as InboundHandlerRegistry<IOPlayer>) ?? undefined,
      cycleIntervalMs,
    );
    this.registerDefaultHandlers();
  }

  injectFrame(payload: FrameRecord): void {
    this.resetIfNewRun(payload.frame.tick);

    const context = this.getContext();
    const entity = context.entityManager.create();
    context.componentManager.addComponent(entity, this.frameComponentType, payload.frame);

    this.frames.push(payload);
    this.publishFrame(payload.frame);
    this.lastFrameTick = payload.frame.tick;
  }

  getFrames(): FrameRecord[] {
    return [...this.frames];
  }

  registerComponent<T>(component: ComponentType<T>): void {
    this.componentTypes.set(component.id, component);
  }

  removeComponent(componentId: string): boolean {
    return this.componentTypes.delete(componentId);
  }

  getRegisteredComponents(): ComponentType<unknown>[] {
    return Array.from(this.componentTypes.values());
  }

  private resetIfNewRun(tick: number): void {
    if (this.lastFrameTick !== null && Number.isFinite(tick) && tick < this.lastFrameTick) {
      this.frames.length = 0;
      this.resetEnvironment();
      this.lastFrameTick = null;
    }
  }

  private registerDefaultHandlers(): void {
    const registry = (this.getInboundHandlers() as unknown as InboundHandlerRegistry<EvaluationPlayer>);

    registry.register(
      EvaluationMessageType.INJECT_FRAME,
      new MessageHandler<EvaluationPlayer, InjectFramePayload>([new InjectFrame()]),
    );
  }
}
