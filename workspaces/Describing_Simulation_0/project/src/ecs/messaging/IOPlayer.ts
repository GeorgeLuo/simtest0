import { Player, type PlayerOptions, type PlayerSnapshot } from '../Player.js';
import { Bus } from './Bus.js';
import {
  createErrorAcknowledgement,
  createSuccessAcknowledgement,
  type AcknowledgementMessage,
} from './handlers/Acknowledgement.js';
import { createFrameMessage, type FrameMessage } from './handlers/Frame.js';
import { InjectEntityHandler, type InjectEntityMessage } from './handlers/InjectEntity.js';
import { PauseHandler, type PauseMessage } from './handlers/Pause.js';
import { StartHandler, type StartMessage } from './handlers/Start.js';
import { StopHandler, type StopMessage } from './handlers/Stop.js';

export type InboundMessage =
  | StartMessage
  | PauseMessage
  | StopMessage
  | InjectEntityMessage;

export type OutboundMessage = AcknowledgementMessage | FrameMessage;

type InboundMessageType = InboundMessage['type'];

type HandlerExecutor = (message: InboundMessage) => Promise<void>;

type PlayerCommandHandler<TMessage extends InboundMessage = InboundMessage> = {
  readonly type: TMessage['type'];
  handle(message: TMessage, player: Player): Promise<void> | void;
};

export interface IOPlayerOptions extends PlayerOptions {
  handlers?: PlayerCommandHandler[];
}

export class IOPlayer extends Player {
  private readonly inputBus: Bus<InboundMessage>;
  private readonly outputBus: Bus<OutboundMessage>;
  private readonly handlerExecutors = new Map<InboundMessageType, HandlerExecutor>();
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

    const handlers: PlayerCommandHandler[] = options.handlers ?? [
      new StartHandler(),
      new PauseHandler(),
      new StopHandler(),
      new InjectEntityHandler(),
    ];

    for (const handler of handlers) {
      if (this.handlerExecutors.has(handler.type)) {
        throw new Error(`Duplicate handler registered for type "${handler.type}"`);
      }

      this.handlerExecutors.set(handler.type, async (message: InboundMessage) => {
        await handler.handle(message as never, this);
      });
    }

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
    const executor = this.handlerExecutors.get(message.type);

    if (!executor) {
      await this.outputBus.publish(
        createErrorAcknowledgement(
          message.id,
          `Unsupported message type: ${message.type}`,
        ),
      );
      return;
    }

    try {
      await executor(message);
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
