import { ComponentManager } from "../components/ComponentManager.js";
import { ComponentType } from "../components/ComponentType.js";
import { EntityManager } from "../entity/EntityManager.js";
import { IOPlayer } from "../IOPlayer.js";
import { Bus } from "../messaging/Bus.js";
import { InboundHandlerRegistry } from "../messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "../messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../messaging/outbound/OutboundMessage.js";
import { Frame } from "../messaging/outbound/Frame.js";
import { FrameFilter } from "../messaging/outbound/FrameFilter.js";
import { SystemManager } from "../systems/SystemManager.js";
export { EVALUATION_FRAME_MESSAGE } from "./messages.js";
export declare const EVALUATION_FRAME_COMPONENT: ComponentType<Frame>;
export interface EvaluationPlayerOptions {
    readonly entityManager: EntityManager;
    readonly componentManager: ComponentManager;
    readonly systemManager: SystemManager;
    readonly inboundBus: Bus<InboundMessage>;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly inboundRegistry: InboundHandlerRegistry;
    readonly frameFilter?: FrameFilter;
}
export declare class EvaluationPlayer extends IOPlayer {
    constructor(options: EvaluationPlayerOptions);
    ingestFrame(frame: Frame): void;
    protected publishEvaluations(): void;
    private registerFrameHandler;
}
