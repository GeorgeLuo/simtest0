import { SimulationPlayer } from "../core/simplayer/SimulationPlayer.js";
import { Bus } from "../core/messaging/Bus.js";
import { InboundMessage } from "../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../core/messaging/outbound/OutboundMessage.js";
import { Router } from "./router.js";
export declare const SIMULATION_ROUTE_PREFIX = "/simulation";
export declare const SIMULATION_START_PATH = "/simulation/start";
export declare const SIMULATION_PAUSE_PATH = "/simulation/pause";
export declare const SIMULATION_STOP_PATH = "/simulation/stop";
export declare const SIMULATION_SYSTEM_PATH = "/simulation/system";
export declare const SIMULATION_SYSTEM_ID_PATH = "/simulation/system/:id";
export declare const SIMULATION_COMPONENT_PATH = "/simulation/component";
export declare const SIMULATION_COMPONENT_ID_PATH = "/simulation/component/:id";
export declare const SIMULATION_STREAM_PATH = "/simulation/stream";
export interface SimulationRouteDependencies {
    readonly player: SimulationPlayer;
    readonly inboundBus: Bus<InboundMessage>;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly createMessageId: () => string;
    readonly acknowledgementTimeoutMs?: number;
}
export declare function registerSimulationRoutes(router: Router, dependencies: SimulationRouteDependencies): void;
