import { IncomingMessage, ServerResponse } from "node:http";
import { Bus } from "../core/messaging/Bus.js";
import { InboundMessage } from "../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../core/messaging/outbound/OutboundMessage.js";
import {
  Acknowledgement,
  errorAck,
} from "../core/messaging/outbound/Acknowledgement.js";

export interface PublishDependencies {
  readonly inboundBus: Bus<InboundMessage>;
  readonly outboundBus: Bus<OutboundMessage>;
  readonly createMessageId: () => string;
}

export interface PublishOptions {
  readonly payload?: unknown;
  readonly acknowledgementTimeoutMs?: number;
}

export async function publishWithAcknowledgement(
  dependencies: PublishDependencies,
  type: string,
  options: PublishOptions = {},
): Promise<Acknowledgement> {
  const messageId = dependencies.createMessageId();
  const acknowledgementPromise = waitForAcknowledgement(
    dependencies.outboundBus,
    messageId,
    options.acknowledgementTimeoutMs,
  );

  dependencies.inboundBus.publish({
    id: messageId,
    type,
    payload:
      options.payload === undefined ? {} : options.payload,
  });

  return acknowledgementPromise;
}

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

export function streamOutboundFrames(options: StreamOptions): void {
  const response = options.response as ResponseLike;
  if (
    !response ||
    typeof response.setHeader !== "function" ||
    typeof response.write !== "function"
  ) {
    throw new Error("response must support setHeader and write for SSE streaming");
  }

  const eventName = options.eventName ?? "frame";
  const keepAliveMs = options.keepAliveMs ?? 15000;

  response.setHeader("content-type", "text/event-stream");
  response.setHeader("cache-control", "no-cache");
  response.setHeader("connection", "keep-alive");
  response.flushHeaders?.();
  // Initial comment to kick off the stream in some clients.
  response.write(`: stream started at ${new Date().toISOString()}\n\n`);

  const unsubscribe = options.outboundBus.subscribe((message) => {
    if (message.type !== "frame") {
      return;
    }

    const payload = JSON.stringify(message.frame);
    const eventPrefix = eventName ? `event: ${eventName}\n` : "";
    response.write(`${eventPrefix}data: ${payload}\n\n`);
  });

  const keepAliveTimer = setInterval(() => {
    response.write(`: keep-alive ${Date.now()}\n\n`);
  }, keepAliveMs);
  keepAliveTimer.unref?.();

  const cleanup = () => {
    clearInterval(keepAliveTimer);
    unsubscribe();
  };

  attachCleanup(options.request, cleanup);
  attachCleanup(response, cleanup);
}

function waitForAcknowledgement(
  outboundBus: Bus<OutboundMessage>,
  messageId: string,
  timeoutMs?: number,
): Promise<Acknowledgement> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const unsubscribe = outboundBus.subscribe((message) => {
      if (
        message.type !== "acknowledgement" ||
        message.acknowledgement.messageId !== messageId
      ) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(message.acknowledgement);
    });

    if (typeof timeoutMs === "number") {
      timer = setTimeout(() => {
          if (settled) {
            return;
          }
          unsubscribe();
          resolve(
            errorAck(
              messageId,
              "Acknowledgement timed out",
            ),
          );
        }, timeoutMs);
    }
  });
}

function attachCleanup(
  target: IncomingMessage | ResponseLike | EventEmitterLike | undefined | null,
  cleanup: () => void,
): void {
  if (!target) {
    return;
  }

  const listener = () => cleanup();

  if (typeof target.once === "function") {
    target.once("close", listener);
  } else if (typeof target.on === "function") {
    target.on("close", listener);
  } else if (typeof target.addListener === "function") {
    target.addListener("close", listener);
  }
}
