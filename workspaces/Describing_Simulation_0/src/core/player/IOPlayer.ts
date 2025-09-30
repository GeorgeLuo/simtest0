import { Bus } from '../messaging/Bus.js';
import { Acknowledgement } from '../messaging/outbound/Acknowledgement.js';
import { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry.js';
import { InboundMessage } from '../messaging/inbound/Operation.js';
import { Player, PlayerOptions } from './Player.js';

export interface IOPlayerOptions extends PlayerOptions {
  inboundBus?: Bus<InboundMessage>;
  acknowledgementBus?: Bus<Acknowledgement>;
}

/**
 * Extends the player with inbound command handling and acknowledgement publication.
 */
export class IOPlayer extends Player {
  readonly registry: InboundHandlerRegistry;
  readonly inboundBus: Bus<InboundMessage>;
  readonly acknowledgementBus: Bus<Acknowledgement>;

  private readonly unsubscribe: () => void;

  constructor(options: IOPlayerOptions = {}) {
    super(options);
    this.registry = new InboundHandlerRegistry();
    this.inboundBus = options.inboundBus ?? new Bus<InboundMessage>();
    this.acknowledgementBus = options.acknowledgementBus ?? new Bus<Acknowledgement>();

    this.unsubscribe = this.inboundBus.subscribe((message) => {
      void this.handleInbound(message);
    });
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    try {
      const ack = await this.registry.dispatch({ player: this, message });
      this.acknowledgementBus.publish(ack);
    } catch (error) {
      const ack = Acknowledgement.error(
        message.id,
        error instanceof Error ? error.message : String(error)
      );
      this.acknowledgementBus.publish(ack);
    }
  }

  dispose(): void {
    this.unsubscribe();
  }
}
