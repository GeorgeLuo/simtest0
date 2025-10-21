import { IncomingMessage, ServerResponse } from "node:http";
import {
  EVALUATION_FRAME_MESSAGE,
  EvaluationPlayer,
} from "../core/evalplayer/EvaluationPlayer.js";
import { Bus } from "../core/messaging/Bus.js";
import { InboundMessage } from "../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../core/messaging/outbound/OutboundMessage.js";
import {
  RouteContext,
  RouteHandler,
  Router,
} from "./router.js";
import {
  publishWithAcknowledgement,
  streamOutboundFrames,
} from "./helpers.js";

export const EVALUATION_ROUTE_PREFIX = "/evaluation";
export const EVALUATION_FRAME_PATH = `${EVALUATION_ROUTE_PREFIX}/frame`;
export const EVALUATION_SYSTEM_PATH = `${EVALUATION_ROUTE_PREFIX}/system`;
export const EVALUATION_SYSTEM_ID_PATH = `${EVALUATION_SYSTEM_PATH}/:id`;
export const EVALUATION_COMPONENT_PATH = `${EVALUATION_ROUTE_PREFIX}/component`;
export const EVALUATION_COMPONENT_ID_PATH = `${EVALUATION_COMPONENT_PATH}/:id`;
export const EVALUATION_STREAM_PATH = `${EVALUATION_ROUTE_PREFIX}/stream`;

const EVALUATION_SYSTEM_INJECT_MESSAGE = "evaluation.system.inject";
const EVALUATION_SYSTEM_EJECT_MESSAGE = "evaluation.system.eject";
const EVALUATION_COMPONENT_INJECT_MESSAGE = "evaluation.component.inject";
const EVALUATION_COMPONENT_EJECT_MESSAGE = "evaluation.component.eject";

export interface EvaluationRouteDependencies {
  readonly player: EvaluationPlayer;
  readonly inboundBus: Bus<InboundMessage>;
  readonly outboundBus: Bus<OutboundMessage>;
  readonly createMessageId: () => string;
  readonly acknowledgementTimeoutMs?: number;
}

export function registerEvaluationRoutes(
  router: Router,
  dependencies: EvaluationRouteDependencies,
): void {
  router.register({
    method: "POST",
    path: EVALUATION_FRAME_PATH,
    handler: createMessageHandler(
      dependencies,
      EVALUATION_FRAME_MESSAGE,
    ),
  });

  router.register({
    method: "POST",
    path: EVALUATION_SYSTEM_PATH,
    handler: createMessageHandler(
      dependencies,
      EVALUATION_SYSTEM_INJECT_MESSAGE,
    ),
  });

  router.register({
    method: "DELETE",
    path: EVALUATION_SYSTEM_ID_PATH,
    handler: createMessageHandler(
      dependencies,
      EVALUATION_SYSTEM_EJECT_MESSAGE,
      (context) => combinePayloadWithParams(context),
    ),
  });

  router.register({
    method: "POST",
    path: EVALUATION_COMPONENT_PATH,
    handler: createMessageHandler(
      dependencies,
      EVALUATION_COMPONENT_INJECT_MESSAGE,
    ),
  });

  router.register({
    method: "DELETE",
    path: EVALUATION_COMPONENT_ID_PATH,
    handler: createMessageHandler(
      dependencies,
      EVALUATION_COMPONENT_EJECT_MESSAGE,
      (context) => combinePayloadWithParams(context),
    ),
  });

  router.register({
    method: "GET",
    path: EVALUATION_STREAM_PATH,
    handler: (context) => {
      streamOutboundFrames({
        request: context.request as IncomingMessage | null | undefined,
        response: context.response as ServerResponse,
        outboundBus: dependencies.outboundBus,
        eventName: "evaluation",
      });
    },
  });
}

function createMessageHandler(
  dependencies: EvaluationRouteDependencies,
  messageType: string,
  payloadFactory: (context: RouteContext) => unknown = extractBody,
): RouteHandler {
  return async (context) => {
    const acknowledgement = await publishWithAcknowledgement(
      {
        inboundBus: dependencies.inboundBus,
        outboundBus: dependencies.outboundBus,
        createMessageId: dependencies.createMessageId,
      },
      messageType,
      {
        payload: payloadFactory(context),
        acknowledgementTimeoutMs: dependencies.acknowledgementTimeoutMs,
      },
    );

    const status =
      acknowledgement.status === "success" ? 200 : 500;

    return {
      status,
      body: { acknowledgement },
    };
  };
}

function extractBody(
  context: RouteContext,
): unknown {
  return context.body === undefined ? {} : context.body;
}

function combinePayloadWithParams(
  context: RouteContext,
): unknown {
  const body = context.body;
  const params = context.params ?? {};

  if (body === undefined) {
    return { ...params };
  }

  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return { ...(body as Record<string, unknown>), ...params };
  }

  return { body, ...params };
}
