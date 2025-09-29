import { IOPlayer } from '../core/player/IOPlayer';
import { EvaluationPlayer } from '../core/player/evaluation';
import { createPlaybackHandlers } from '../core/player/operations';
import { createEvaluationHandlers } from '../core/player/evaluation/operations';
import { pipeFrames } from '../core/player/integration/pipeFrames';

export interface SimEvalEnvironment {
  simulation: IOPlayer;
  evaluation: EvaluationPlayer;
  teardown: () => void;
}

export function createEnvironment(): SimEvalEnvironment {
  const simulation = new IOPlayer();
  const evaluation = new EvaluationPlayer();

  createPlaybackHandlers(simulation);
  createEvaluationHandlers(evaluation);

  const teardownPipe = pipeFrames(simulation, evaluation);

  const teardown = () => {
    teardownPipe();
    simulation.stop();
    evaluation.stop();
    simulation.dispose?.();
    evaluation.dispose?.();
  };

  return { simulation, evaluation, teardown };
}
