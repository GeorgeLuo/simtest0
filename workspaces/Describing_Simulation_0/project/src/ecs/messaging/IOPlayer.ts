import { Player, type PlayerOptions, type PlayerSnapshot } from '../Player.js';
import { Bus } from './Bus.js';
import {
  InboundHandlerRegistry,
  type InboundMessageHandler,
} from './handlers/inbound/InboundHandlerRegistry.js';
import { InjectEntityHandler, type InjectEntityMessage } from './handlers/inbound/implementations/InjectEntity.js';
import { PauseHandler, type PauseMessage } from './handlers/inbound/implementations/Pause.js';
import { StartHandler, type StartMessage } from './handlers/inbound/implementations/Start.js';
import { StopHandler, type StopMessage } from './handlers/inbound/implementations/Stop.js';
import {
  createErrorAcknowledgement,
  createSuccessAcknowledgement,
  type AcknowledgementMessage,
} from './handlers/outbound/implementations/Acknowledgement.js';
import { createFrameMessage, type FrameMessage } from './handlers/outbound/implementations/Frame.js';

export type InboundMessage =
  | StartMessage
  | PauseMessage
  | StopMessage
  | InjectEntityMessage;

export type OutboundMessage = AcknowledgementMessage | FrameMessage;

type PlayerInboundHandler<TMessage extends InboundMessage = InboundMessage> =
  InboundMessageHandler<TMessage, Player>;

export interface IOPlayerOptions extends PlayerOptions {
  handlers?: ReadonlyArray<PlayerInboundHandler>;
  handlerRegistry?: InboundHandlerRegistry<InboundMessage, Player>;
}

export class IOPlayer extends Player {
  private readonly inputBus: Bus<InboundMessage>;
  private readonly outputBus: Bus<OutboundMessage>;
  private readonly inboundHandlerRegistry: InboundHandlerRegistry<InboundMessage, Player>;
  private unsubscribeInput?: () => void;

  constructor(
    entityManager: Player['entityManager'],
    componentManager: Player['componentManager'],
    systemManager: Player['systemManager'],
    inputBus: Bus<InboundMessage>,
    outputBus: Bus<OutboundMessage>,
    options: IOPlayerOptions = {},
  ) {
    super(entityManager, componentManager, systemManager, options);

    this.inputBus = inputBus;
    this.outputBus = outputBus;

    const inboundHandlerRegistry =
      options.handlerRegistry ?? new InboundHandlerRegistry<InboundMessage, Player>();

    const handlersToRegister =
      options.handlers ??
      (!options.handlerRegistry
        ? [
            new StartHandler(),
            new PauseHandler(),
            new StopHandler(),
            new InjectEntityHandler(),
          ]
        : undefined);

    if (handlersToRegister) {
      for (const handler of handlersToRegister) {
        inboundHandlerRegistry.register(handler);
      }
    }

    this.inboundHandlerRegistry = inboundHandlerRegistry;

    this.unsubscribeInput = this.inputBus.subscribe((message) => this.handleInbound(message));
  }

  override async stop(): Promise<void> {
    await super.stop();
    await this.emitFrame();
  }

  dispose(): void {
    if (this.unsubscribeInput) {
      this.unsubscribeInput();
      this.unsubscribeInput = undefined;
    }
  }

  protected override async afterUpdate(): Promise<void> {
    await super.afterUpdate();
    await this.emitFrame();
  }

  private async handleInbound(message: InboundMessage): Promise<void> {
    const handler = this.inboundHandlerRegistry.resolve(message.type);

    if (!handler) {
      await this.outputBus.publish(
        createErrorAcknowledgement(
          message.id,
          `Unsupported message type: ${message.type}`,
        ),
      );
      return;
    }

    try {
      await handler.handle(message, this);
      await this.outputBus.publish(createSuccessAcknowledgement(message.id));
      await this.emitFrame();
    } catch (error) {
      await this.outputBus.publish(createErrorAcknowledgement(message.id, error));
    }
  }

  private async emitFrame(): Promise<void> {
    const snapshot: PlayerSnapshot = this.captureSnapshot();
    await this.outputBus.publish(createFrameMessage(snapshot));
  }
}
