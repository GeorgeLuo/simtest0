import { IOPlayer } from '../IOPlayer';
import { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import { Bus } from '../messaging/Bus';

/**
 * Concrete IO player variant tailored for simulation control operations.
 */
export class SimulationPlayer extends IOPlayer {
  constructor(inboundBus: Bus, outboundBus: Bus, handlerRegistry: InboundHandlerRegistry) {
    super(inboundBus, outboundBus, handlerRegistry);
  }
}
