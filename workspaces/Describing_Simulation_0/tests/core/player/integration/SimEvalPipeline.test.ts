import { describe, expect, it } from 'vitest';
import { IOPlayer } from '../../../../src/core/player/IOPlayer';
import { EvaluationPlayer } from '../../../../src/core/player/evaluation';
import { Bus } from '../../../../src/core/messaging/Bus';
import { Frame } from '../../../../src/core/messaging/Frame';
import { Acknowledgement } from '../../../../src/core/messaging/outbound/Acknowledgement';
import { createPlaybackHandlers } from '../../../../src/core/player/operations';
import { createEvaluationHandlers } from '../../../../src/core/player/evaluation/operations';
import { pipeFrames } from '../../../../src/core/player/integration/pipeFrames';

const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('Simulation ↔ Evaluation pipeline', () => {
  it('pipes simulation frames into the evaluation player and acknowledges commands', async () => {
    const simInbound = new Bus<{ id: string; type: string }>();
    const simAck = new Bus<Acknowledgement>();
    const simOutbound = new Bus<Frame>();

    const evalInbound = new Bus<{ id: string; type: string; data?: Frame }>();
    const evalAck = new Bus<Acknowledgement>();
    const evalOutbound = new Bus<Frame>();

    const simulationPlayer = new IOPlayer({
      inboundBus: simInbound,
      acknowledgementBus: simAck,
      outboundBus: simOutbound,
      tickIntervalMs: 1_000_000
    });

    const evaluationPlayer = new EvaluationPlayer({
      inboundBus: evalInbound,
      acknowledgementBus: evalAck,
      outboundBus: evalOutbound,
      tickIntervalMs: 1_000_000
    });

    createPlaybackHandlers(simulationPlayer);
    createEvaluationHandlers(evaluationPlayer);

    pipeFrames(simulationPlayer, evaluationPlayer);

    const evalFrames: Frame[] = [];
    evaluationPlayer.outboundBus.subscribe((frame) => evalFrames.push(frame));

    simInbound.publish({ id: 'start', type: 'start' });
    await flushAsync();

    expect(evalFrames.length).toBeGreaterThan(0);

    const latest = evalFrames.at(-1);
    expect(latest?.tick).toBeGreaterThanOrEqual(0);

    const storedEntities = evaluationPlayer.componentManager.getEntitiesWith(evaluationPlayer.frameComponent);
    expect(storedEntities.length).toBeGreaterThan(0);
  });
});
