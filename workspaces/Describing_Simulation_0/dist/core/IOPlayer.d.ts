import { ComponentManager } from "./components/ComponentManager.js";
import { EntityManager } from "./entity/EntityManager.js";
import { Player } from "./Player.js";
import { Bus } from "./messaging/Bus.js";
import { InboundHandlerRegistry } from "./messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "./messaging/inbound/InboundMessage.js";
import { FrameFilter } from "./messaging/outbound/FrameFilter.js";
import { OutboundMessage } from "./messaging/outbound/OutboundMessage.js";
import { SystemManager } from "./systems/SystemManager.js";
interface IOPlayerOptions {
    entityManager: EntityManager;
    componentManager: ComponentManager;
    systemManager: SystemManager;
    inboundBus: Bus<InboundMessage>;
    outboundBus: Bus<OutboundMessage>;
    inboundRegistry: InboundHandlerRegistry;
    frameFilter?: FrameFilter;
}
export declare class IOPlayer extends Player {
    private readonly unsubscribeInbound;
    protected readonly frameFilter: FrameFilter;
    constructor(options: IOPlayerOptions);
    protected readonly outboundBus: Bus<OutboundMessage>;
    private readonly inboundRegistry;
    dispose(): void;
    protected onAfterStep(): void;
    private handleInbound;
    private emitFrame;
}
export {};
