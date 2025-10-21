import { SIMULATION_PAUSE_MESSAGE, SIMULATION_START_MESSAGE, SIMULATION_STOP_MESSAGE, SIMULATION_SYSTEM_INJECT_MESSAGE, SIMULATION_SYSTEM_EJECT_MESSAGE, SIMULATION_COMPONENT_INJECT_MESSAGE, SIMULATION_COMPONENT_EJECT_MESSAGE, } from "../core/simplayer/SimulationPlayer.js";
import { publishWithAcknowledgement, streamOutboundFrames, } from "./helpers.js";
export const SIMULATION_ROUTE_PREFIX = "/simulation";
export const SIMULATION_START_PATH = `${SIMULATION_ROUTE_PREFIX}/start`;
export const SIMULATION_PAUSE_PATH = `${SIMULATION_ROUTE_PREFIX}/pause`;
export const SIMULATION_STOP_PATH = `${SIMULATION_ROUTE_PREFIX}/stop`;
export const SIMULATION_SYSTEM_PATH = `${SIMULATION_ROUTE_PREFIX}/system`;
export const SIMULATION_SYSTEM_ID_PATH = `${SIMULATION_SYSTEM_PATH}/:id`;
export const SIMULATION_COMPONENT_PATH = `${SIMULATION_ROUTE_PREFIX}/component`;
export const SIMULATION_COMPONENT_ID_PATH = `${SIMULATION_COMPONENT_PATH}/:id`;
export const SIMULATION_STREAM_PATH = `${SIMULATION_ROUTE_PREFIX}/stream`;
export function registerSimulationRoutes(router, dependencies) {
    router.register({
        method: "POST",
        path: SIMULATION_START_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_START_MESSAGE),
    });
    router.register({
        method: "POST",
        path: SIMULATION_PAUSE_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_PAUSE_MESSAGE),
    });
    router.register({
        method: "POST",
        path: SIMULATION_STOP_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_STOP_MESSAGE),
    });
    router.register({
        method: "POST",
        path: SIMULATION_SYSTEM_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_SYSTEM_INJECT_MESSAGE),
    });
    router.register({
        method: "DELETE",
        path: SIMULATION_SYSTEM_ID_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_SYSTEM_EJECT_MESSAGE, (context) => combinePayloadWithParams(context)),
    });
    router.register({
        method: "POST",
        path: SIMULATION_COMPONENT_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_COMPONENT_INJECT_MESSAGE),
    });
    router.register({
        method: "DELETE",
        path: SIMULATION_COMPONENT_ID_PATH,
        handler: createMessageHandler(dependencies, SIMULATION_COMPONENT_EJECT_MESSAGE, (context) => combinePayloadWithParams(context)),
    });
    router.register({
        method: "GET",
        path: SIMULATION_STREAM_PATH,
        handler: (context) => {
            streamOutboundFrames({
                request: context.request,
                response: context.response,
                outboundBus: dependencies.outboundBus,
                eventName: "simulation",
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
