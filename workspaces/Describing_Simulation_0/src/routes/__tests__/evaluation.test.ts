import { describe, expect, it, vi } from "vitest";
import { Bus } from "../../core/messaging/Bus.js";
import { InboundMessage } from "../../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../../core/messaging/outbound/OutboundMessage.js";
import { successAck } from "../../core/messaging/outbound/Acknowledgement.js";
import {
  EvaluationPlayer,
  EVALUATION_FRAME_MESSAGE,
} from "../../core/evalplayer/EvaluationPlayer.js";
import {
  EVALUATION_FRAME_PATH,
  EVALUATION_STREAM_PATH,
  registerEvaluationRoutes,
  EvaluationRouteDependencies,
} from "../evaluation.js";
import { RouteContext, RouteDefinition, Router } from "../router.js";

interface RouterCapture {
  router: Router;
  routes: RouteDefinition[];
}

const createRouterCapture = (): RouterCapture => {
  const routes: RouteDefinition[] = [];
  const router = {
    register: (definition: RouteDefinition) => {
      routes.push(definition);
    },
    getRoutes: vi.fn(),
    createListener: vi.fn(),
  } as unknown as Router;

  return { router, routes };
};

const createDependencies = (): EvaluationRouteDependencies & {
  inboundBus: Bus<InboundMessage>;
  outboundBus: Bus<OutboundMessage>;
  player: EvaluationPlayer;
} => {
  const inboundBus = new Bus<InboundMessage>();
  const outboundBus = new Bus<OutboundMessage>();
  const player = {
    ingestFrame: vi.fn(),
  } as unknown as EvaluationPlayer;
  let messageCounter = 0;

  return {
    player,
    inboundBus,
    outboundBus,
    createMessageId: () => `msg-${messageCounter++}`,
    acknowledgementTimeoutMs: 10,
  };
};

const findRoute = (
  routes: RouteDefinition[],
  path: string,
  method: RouteDefinition["method"],
): RouteDefinition => {
  const route = routes.find((definition) => definition.path === path && definition.method === method);
  if (!route) {
    throw new Error(`Route ${method} ${path} not registered`);
  }
  return route;
};

const createContext = (overrides?: Partial<RouteContext>): RouteContext => ({
  request: {},
  response: {},
  ...overrides,
});

const createSseResponse = () => {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((key: string, value: string) => {
      headers[key.toLowerCase()] = value;
    }),
    write: vi.fn(),
    end: vi.fn(),
    flushHeaders: vi.fn(),
  };
};

describe("registerEvaluationRoutes", () => {
  it("registers frame ingestion and stream routes", () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    expect(() => registerEvaluationRoutes(router, dependencies)).not.toThrow();

    const paths = routes.map((route) => `${route.method} ${route.path}`);
    expect(paths).toEqual(
      expect.arrayContaining([
        `POST ${EVALUATION_FRAME_PATH}`,
        `GET ${EVALUATION_STREAM_PATH}`,
      ]),
    );
  });

  it("publishes frame injections and resolves with acknowledgement", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();
    const inboundMessages: InboundMessage[] = [];

    dependencies.inboundBus.subscribe((message) => {
      inboundMessages.push(message);
      dependencies.outboundBus.publish({
        type: "acknowledgement",
        acknowledgement: successAck(message.id),
      });
    });

    registerEvaluationRoutes(router, dependencies);

    const frameRoute = findRoute(routes, EVALUATION_FRAME_PATH, "POST");
    const result = await frameRoute.handler(
      createContext({
        body: {
          frame: { tick: 1, entities: [] },
        },
      }),
    );

    expect(inboundMessages).toHaveLength(1);
    expect(inboundMessages[0].type).toBe(EVALUATION_FRAME_MESSAGE);
    expect(result).toMatchObject({
      status: 200,
      body: {
        acknowledgement: expect.objectContaining({ status: "success" }),
      },
    });
  });

  it("streams evaluation outbound frames to SSE clients", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();
    registerEvaluationRoutes(router, dependencies);

    const streamRoute = findRoute(routes, EVALUATION_STREAM_PATH, "GET");
    const response = createSseResponse();

    await streamRoute.handler(createContext({ response }));

    dependencies.outboundBus.publish({
      type: "frame",
      frame: { tick: 7, entities: [] },
    });

    expect(response.setHeader).toHaveBeenCalledWith("content-type", "text/event-stream");
    expect(response.write).toHaveBeenCalledWith(expect.stringContaining("\"tick\":7"));
    expect(response.end).not.toHaveBeenCalled();
  });
});
