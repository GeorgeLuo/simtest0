import { EvaluationPlayer } from "../core/evalplayer/EvaluationPlayer.js";
import { Bus } from "../core/messaging/Bus.js";
import { InboundMessage } from "../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../core/messaging/outbound/OutboundMessage.js";
import { Router } from "./router.js";
export declare const EVALUATION_ROUTE_PREFIX = "/evaluation";
export declare const EVALUATION_FRAME_PATH = "/evaluation/frame";
export declare const EVALUATION_SYSTEM_PATH = "/evaluation/system";
export declare const EVALUATION_SYSTEM_ID_PATH = "/evaluation/system/:id";
export declare const EVALUATION_COMPONENT_PATH = "/evaluation/component";
export declare const EVALUATION_COMPONENT_ID_PATH = "/evaluation/component/:id";
export declare const EVALUATION_STREAM_PATH = "/evaluation/stream";
export interface EvaluationRouteDependencies {
    readonly player: EvaluationPlayer;
    readonly inboundBus: Bus<InboundMessage>;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly createMessageId: () => string;
    readonly acknowledgementTimeoutMs?: number;
}
export declare function registerEvaluationRoutes(router: Router, dependencies: EvaluationRouteDependencies): void;
