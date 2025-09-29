import { describe, expect, it } from 'vitest';
import { EvaluationPlayer } from '../../../../src/core/player/evaluation/EvaluationPlayer';
import { createEvaluationHandlers } from '../../../../src/core/player/evaluation/operations';
import { Bus } from '../../../../src/core/messaging/Bus';
import { Frame } from '../../../../src/core/messaging/Frame';
import { Acknowledgement } from '../../../../src/core/messaging/outbound/Acknowledgement';

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('EvaluationPlayer', () => {
  it('registers handlers and stores injected frames', async () => {
    const inbound = new Bus<{ id: string; type: string; data?: Frame }>();
    const ackBus = new Bus<Acknowledgement>();
    const outbound = new Bus<Frame>();

    const player = new EvaluationPlayer({
      inboundBus: inbound,
      acknowledgementBus: ackBus,
      outboundBus: outbound,
      tickIntervalMs: 1_000_000
    });

    createEvaluationHandlers(player);

    const acknowledgements: Acknowledgement[] = [];
    ackBus.subscribe((ack) => acknowledgements.push(ack));

    const frame: Frame = {
      tick: 7,
      entities: {
        1: { metric: { value: 42 } }
      }
    };

    inbound.publish({ id: 'inject', type: 'inject-frame', data: frame });
    await flushAsync();

    expect(acknowledgements).toHaveLength(1);
    expect(acknowledgements[0].success).toBe(true);

    const entities = player.componentManager.getEntitiesWith(player.frameComponent);
    expect(entities).toHaveLength(1);

    const stored = player.componentManager.getComponent(entities[0], player.frameComponent);
    expect(stored?.data.frame).toEqual(frame);

    const outboundFrames: Frame[] = [];
    outbound.subscribe((f) => outboundFrames.push(f));

    player.emitEvaluationFrame();

    expect(outboundFrames).toHaveLength(1);
    expect(outboundFrames[0].entities[entities[0]]).toEqual({});
  });
});
