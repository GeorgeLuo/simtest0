import { ComponentType } from '../../components/ComponentType.js';
import { Entity } from '../../entity/Entity.js';
import { Frame } from '../../messaging/Frame.js';

export interface FrameComponentData {
  frame: Frame;
  storedAt: number;
}

export class FrameComponentType extends ComponentType<FrameComponentData> {
  static readonly ID = 'evaluation.frame';

  constructor() {
    super(FrameComponentType.ID);
  }

  protected override validate(data: FrameComponentData): void {
    if (!Number.isInteger(data.frame.tick) || data.frame.tick < 0) {
      throw new Error('Frame tick must be a non-negative integer');
    }
  }

  override create(entity: Entity, data: FrameComponentData) {
    return super.create(entity, { frame: data.frame, storedAt: data.storedAt });
  }
}
