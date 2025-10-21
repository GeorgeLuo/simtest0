import { IncomingMessage, ServerResponse } from "node:http";
import { Bus } from "../core/messaging/Bus.js";
import { InboundMessage } from "../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../core/messaging/outbound/OutboundMessage.js";
import { Acknowledgement } from "../core/messaging/outbound/Acknowledgement.js";
export interface PublishDependencies {
    readonly inboundBus: Bus<InboundMessage>;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly createMessageId: () => string;
}
export interface PublishOptions {
    readonly payload?: unknown;
    readonly acknowledgementTimeoutMs?: number;
}
export declare function publishWithAcknowledgement(dependencies: PublishDependencies, type: string, options?: PublishOptions): Promise<Acknowledgement>;
interface EventEmitterLike {
    on?(event: string, listener: () => void): void;
    once?(event: string, listener: () => void): void;
    addListener?(event: string, listener: () => void): void;
    removeListener?(event: string, listener: () => void): void;
}
type ResponseLike = ServerResponse & {
    flushHeaders?(): void;
};
interface StreamOptions {
    readonly request?: IncomingMessage | EventEmitterLike | null;
    readonly response: ResponseLike | EventEmitterLike;
    readonly outboundBus: Bus<OutboundMessage>;
    readonly eventName?: string;
    readonly keepAliveMs?: number;
}
export declare function streamOutboundFrames(options: StreamOptions): void;
export {};
