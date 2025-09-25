import { IOPlayer } from '../IOPlayer';
import { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import { Bus } from '../messaging/Bus';

/**
 * IO player variant for evaluation workflows that focuses on ingesting frames.
 */
export class EvaluationPlayer extends IOPlayer {
  constructor(inboundBus: Bus, outboundBus: Bus, handlerRegistry: InboundHandlerRegistry) {
    super(inboundBus, outboundBus, handlerRegistry);
  }
}
