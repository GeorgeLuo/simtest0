import { describe, expect, it } from 'vitest';
import { EvaluationPlayer } from '../../../../src/core/player/evaluation/EvaluationPlayer';
import { InjectFrameOperation } from '../../../../src/core/player/evaluation/operations/InjectFrameOperation';
import { Frame } from '../../../../src/core/messaging/Frame';

const createPlayer = () => new EvaluationPlayer({ tickIntervalMs: 1_000_000 });

describe('InjectFrameOperation', () => {
  it('stores frames as entities with frame components', async () => {
    const player = createPlayer();
    const operation = new InjectFrameOperation();

    const frame: Frame = {
      tick: 5,
      entities: {
        1: { velocity: { x: 2 } }
      }
    };

    const result = await operation.execute({
      player,
      message: { id: 'frame-1', type: 'inject-frame', data: frame }
    });

    expect(result.entity).toBeDefined();
    expect(player.entityManager.hasEntity(result.entity)).toBe(true);

    const component = player.componentManager.getComponent(result.entity, player.frameComponent);
    expect(component?.data.frame).toEqual(frame);
    expect(component?.data.storedAt).toBeGreaterThan(0);
  });
});
