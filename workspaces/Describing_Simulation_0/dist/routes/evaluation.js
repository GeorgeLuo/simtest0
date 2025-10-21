import { EVALUATION_FRAME_MESSAGE, } from "../core/evalplayer/EvaluationPlayer.js";
import { publishWithAcknowledgement, streamOutboundFrames, } from "./helpers.js";
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
export function registerEvaluationRoutes(router, dependencies) {
    router.register({
        method: "POST",
        path: EVALUATION_FRAME_PATH,
        handler: createMessageHandler(dependencies, EVALUATION_FRAME_MESSAGE),
    });
    router.register({
        method: "POST",
        path: EVALUATION_SYSTEM_PATH,
        handler: createMessageHandler(dependencies, EVALUATION_SYSTEM_INJECT_MESSAGE),
    });
    router.register({
        method: "DELETE",
        path: EVALUATION_SYSTEM_ID_PATH,
        handler: createMessageHandler(dependencies, EVALUATION_SYSTEM_EJECT_MESSAGE, (context) => combinePayloadWithParams(context)),
    });
    router.register({
        method: "POST",
        path: EVALUATION_COMPONENT_PATH,
        handler: createMessageHandler(dependencies, EVALUATION_COMPONENT_INJECT_MESSAGE),
    });
    router.register({
        method: "DELETE",
        path: EVALUATION_COMPONENT_ID_PATH,
        handler: createMessageHandler(dependencies, EVALUATION_COMPONENT_EJECT_MESSAGE, (context) => combinePayloadWithParams(context)),
    });
    router.register({
        method: "GET",
        path: EVALUATION_STREAM_PATH,
        handler: (context) => {
            streamOutboundFrames({
                request: context.request,
                response: context.response,
                outboundBus: dependencies.outboundBus,
                eventName: "evaluation",
            });
        },
    });
}
function createMessageHandler(dependencies, messageType, payloadFactory = extractBody) {
    return async (context) => {
        const acknowledgement = await publishWithAcknowledgement({
            inboundBus: dependencies.inboundBus,
            outboundBus: dependencies.outboundBus,
            createMessageId: dependencies.createMessageId,
        }, messageType, {
            payload: payloadFactory(context),
            acknowledgementTimeoutMs: dependencies.acknowledgementTimeoutMs,
        });
        const status = acknowledgement.status === "success" ? 200 : 500;
        return {
            status,
            body: { acknowledgement },
        };
    };
}
function extractBody(context) {
    return context.body === undefined ? {} : context.body;
}
function combinePayloadWithParams(context) {
    const body = context.body;
    const params = context.params ?? {};
    if (body === undefined) {
        return { ...params };
    }
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
        return { ...body, ...params };
    }
    return { body, ...params };
}
