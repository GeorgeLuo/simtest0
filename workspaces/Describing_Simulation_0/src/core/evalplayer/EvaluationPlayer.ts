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

export class EvaluationPlayer extends IOPlayer {
  protected readonly frames: FrameRecord[] = [];
  private readonly componentTypes = new Map<string, ComponentType<unknown>>();

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
    this.frames.push(payload);
    this.publishFrame(payload.frame);
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

  private registerDefaultHandlers(): void {
    const registry = (this.getInboundHandlers() as unknown as InboundHandlerRegistry<EvaluationPlayer>);

    registry.register(
      EvaluationMessageType.INJECT_FRAME,
      new MessageHandler<EvaluationPlayer, InjectFramePayload>([new InjectFrame()]),
    );
  }
}
