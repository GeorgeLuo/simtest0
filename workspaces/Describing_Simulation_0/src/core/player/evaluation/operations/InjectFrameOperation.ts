import { Entity } from '../../../entity/Entity.js';
import { Frame } from '../../../messaging/Frame.js';
import { Operation, OperationContext } from '../../../messaging/inbound/Operation.js';
import { EvaluationPlayer } from '../EvaluationPlayer.js';

export interface InjectFrameResult {
  entity: Entity;
}

export class InjectFrameOperation extends Operation<Frame, InjectFrameResult> {
  constructor() {
    super('inject-frame');
  }

  override async execute(context: OperationContext<Frame>): Promise<InjectFrameResult> {
    const frame = context.message.data;
    if (!frame) {
      throw new Error('Frame data is required');
    }

    const player = context.player as EvaluationPlayer;
    const entity = player.entityManager.createEntity();
    player.componentManager.addComponent(entity, player.frameComponent, {
      frame,
      storedAt: Date.now()
    });

    return { entity };
  }
}
