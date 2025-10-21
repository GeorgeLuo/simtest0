import { ComponentManager } from "../components/ComponentManager.js";
import { EntityManager } from "../entity/EntityManager.js";
import { IOPlayer } from "../IOPlayer.js";
import { Bus } from "../messaging/Bus.js";
import { InboundHandlerRegistry } from "../messaging/inbound/InboundHandlerRegistry.js";
import { InboundMessage } from "../messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../messaging/outbound/OutboundMessage.js";
import { FrameFilter } from "../messaging/outbound/FrameFilter.js";
import { SystemManager } from "../systems/SystemManager.js";
export { SIMULATION_START_MESSAGE, SIMULATION_PAUSE_MESSAGE, SIMULATION_STOP_MESSAGE, SIMULATION_SYSTEM_INJECT_MESSAGE, SIMULATION_SYSTEM_EJECT_MESSAGE, SIMULATION_COMPONENT_INJECT_MESSAGE, SIMULATION_COMPONENT_EJECT_MESSAGE, } from "./messages.js";
export interface SimulationPlayerOptions {
    readonly entityManager: EntityManager;
    readonly componentManager: ComponentManager;
    readonly systemManager: SystemManager;
    readonly inboundBus: Bus<InboundMessage>;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly inboundRegistry: InboundHandlerRegistry;
    readonly frameFilter?: FrameFilter;
    readonly pluginDirectory?: string;
    readonly tickIntervalMs?: number;
}
export declare class SimulationPlayer extends IOPlayer {
    private readonly pluginDirectory;
    private readonly tickIntervalMs;
    private tickTimer;
    constructor(options: SimulationPlayerOptions);
    start(): void;
    pause(): void;
    stop(): void;
    dispose(): void;
    injectSystem(payload: InjectSystemPayload): Promise<void>;
    removeSystem(id: string): void;
    private registerPlaybackControls;
    private registerDynamicContentHandlers;
    private installCoreSystems;
    private hasSystem;
    private startTicker;
    private stopTicker;
    private loadSystemConstructor;
    private resolvePluginModulePath;
    private resolveModuleUrl;
    private getModuleVersion;
}
export interface InjectSystemPayload {
    readonly id: string;
    readonly module: string;
    readonly options?: unknown;
    readonly index?: number;
    readonly exportName?: string;
}
