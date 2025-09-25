import { Player } from './Player';
import { InboundHandlerRegistry } from './messaging/inbound/InboundHandlerRegistry';
import { Bus } from './messaging/Bus';

/**
 * Input/Output oriented player that reacts to inbound messages and publishes simulation frames.
 */
export class IOPlayer extends Player {
  constructor(
    private readonly inboundBus: Bus,
    private readonly outboundBus: Bus,
    private readonly handlerRegistry: InboundHandlerRegistry,
  ) {
    super();
  }

  /**
   * Registers subscriptions required for interactive control of the player.
   */
  bindMessaging(): void {
    this.inboundBus.subscribe((message) => {
      this.handlerRegistry.dispatch(message, this);
    });
  }
}
