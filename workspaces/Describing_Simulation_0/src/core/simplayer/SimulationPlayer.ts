import type { SystemManager } from '../systems/SystemManager';
import type { Bus } from '../messaging/Bus';
import type { Frame } from '../messaging/outbound/Frame';
import type { Acknowledgement } from '../messaging/outbound/Acknowledgement';
import type { FrameFilter } from '../messaging/outbound/FrameFilter';
import { MessageHandler } from '../messaging/inbound/MessageHandler';
import type { InboundHandlerRegistry } from '../messaging/inbound/InboundHandlerRegistry';
import { IOPlayer } from '../IOPlayer';
import { Start, type StartPayload } from './operations/Start';
import { Pause, type PausePayload } from './operations/Pause';
import { Stop, type StopPayload } from './operations/Stop';
import { InjectSystem, type InjectSystemPayload } from './operations/InjectSystem';
import { EjectSystem, type EjectSystemPayload } from './operations/EjectSystem';

type OutboundMessage = Frame | Acknowledgement;

export const SimulationMessageType = {
  START: 'start',
  PAUSE: 'pause',
  STOP: 'stop',
  INJECT_SYSTEM: 'inject-system',
  EJECT_SYSTEM: 'eject-system',
} as const;

export class SimulationPlayer extends IOPlayer {
  constructor(
    systemManager: SystemManager,
    inbound: Bus<unknown>,
    outbound: Bus<OutboundMessage>,
    frameFilter: FrameFilter,
    handlers?: InboundHandlerRegistry<IOPlayer>,
    cycleIntervalMs?: number,
  ) {
    super(systemManager, inbound, outbound, frameFilter, handlers, cycleIntervalMs);
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    const registry = this.getInboundHandlers();

    registry.register(
      SimulationMessageType.START,
      new MessageHandler<IOPlayer, StartPayload>([new Start()]),
    );

    registry.register(
      SimulationMessageType.PAUSE,
      new MessageHandler<IOPlayer, PausePayload>([new Pause()]),
    );

    registry.register(
      SimulationMessageType.STOP,
      new MessageHandler<IOPlayer, StopPayload>([new Stop()]),
    );

    registry.register(
      SimulationMessageType.INJECT_SYSTEM,
      new MessageHandler<IOPlayer, InjectSystemPayload>([new InjectSystem()]),
    );

    registry.register(
      SimulationMessageType.EJECT_SYSTEM,
      new MessageHandler<IOPlayer, EjectSystemPayload>([new EjectSystem()]),
    );
  }
}
