import { Bus } from '../../messaging/Bus.js';
import { Frame } from '../../messaging/Frame.js';
import { IOPlayer } from '../IOPlayer.js';
import { EvaluationPlayer } from '../evaluation/index.js';
import { Acknowledgement } from '../../messaging/outbound/Acknowledgement.js';

interface PipeOptions {
  transform?: (frame: Frame) => Frame;
  acknowledgementBus?: Bus<Acknowledgement>;
}

/**
 * Pipes frames emitted by the simulation player into the evaluation player's inbound bus.
 */
export function pipeFrames(
  simulation: IOPlayer,
  evaluation: EvaluationPlayer,
  options: PipeOptions = {}
): () => void {
  const transform = options.transform ?? ((frame: Frame) => frame);
  const acknowledgementBus = options.acknowledgementBus ?? evaluation.acknowledgementBus;

  const unsubscribeOutbound = simulation.outboundBus.subscribe((frame) => {
    const transformed = transform(frame);
    evaluation.inboundBus.publish({ id: `frame-${transformed.tick}`, type: 'inject-frame', data: transformed });
    evaluation.emitEvaluationFrame();
  });

  const unsubscribeAck = simulation.acknowledgementBus.subscribe((ack) => {
    acknowledgementBus.publish(ack);
  });

  return () => {
    unsubscribeOutbound();
    unsubscribeAck();
  };
}
