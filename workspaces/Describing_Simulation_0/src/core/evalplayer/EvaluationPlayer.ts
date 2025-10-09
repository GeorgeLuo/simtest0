import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import type { Frame } from '../messaging/outbound/Frame';
import type { Acknowledgement } from '../messaging/outbound/Acknowledgement';
import type { FrameFilter } from '../messaging/outbound/FrameFilter';
import type { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import { IOPlayer } from '../simplayer/IOPlayer';

export interface FrameRecord {
  messageId?: string;
  frame: Frame;
}

export interface ConditionRecord {
  conditionId: string;
  definition: unknown;
}

export class EvaluationPlayer extends IOPlayer {
  protected readonly frames: FrameRecord[] = [];
  protected readonly conditions = new Map<string, ConditionRecord>();

  constructor(
    systemManager: SystemManager,
    inbound: Bus<unknown>,
    outbound: Bus<Frame | Acknowledgement>,
    frameFilter: FrameFilter,
    handlers: InboundHandlerRegistry<EvaluationPlayer>,
    cycleIntervalMs?: number,
  ) {
    super(systemManager, inbound, outbound, frameFilter, handlers, cycleIntervalMs);
  }

  injectFrame(payload: FrameRecord): void {
    this.frames.push(payload);
    this.publishFrame(payload.frame);
  }

  registerCondition(payload: ConditionRecord): void {
    this.conditions.set(payload.conditionId, payload);
  }

  removeCondition(payload: { conditionId: string }): void {
    this.conditions.delete(payload.conditionId);
  }

  getFrames(): FrameRecord[] {
    return [...this.frames];
  }

  getConditions(): ConditionRecord[] {
    return Array.from(this.conditions.values());
  }
}
