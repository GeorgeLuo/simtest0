import { describe, expect, it, vi } from "vitest";
import { Bus } from "../../core/messaging/Bus.js";
import { InboundMessage } from "../../core/messaging/inbound/InboundMessage.js";
import { OutboundMessage } from "../../core/messaging/outbound/OutboundMessage.js";
import { successAck } from "../../core/messaging/outbound/Acknowledgement.js";
import {
  SIMULATION_START_MESSAGE,
  SIMULATION_PAUSE_MESSAGE,
  SIMULATION_STOP_MESSAGE,
  SimulationPlayer,
} from "../../core/simplayer/SimulationPlayer.js";
import {
  registerSimulationRoutes,
  SimulationRouteDependencies,
  SIMULATION_START_PATH,
  SIMULATION_PAUSE_PATH,
  SIMULATION_STOP_PATH,
  SIMULATION_STREAM_PATH,
} from "../simulation.js";
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

const createDependencies = (): SimulationRouteDependencies & {
  inboundBus: Bus<InboundMessage>;
  outboundBus: Bus<OutboundMessage>;
  player: SimulationPlayer;
} => {
  const inboundBus = new Bus<InboundMessage>();
  const outboundBus = new Bus<OutboundMessage>();
  const player = {
    start: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
  } as unknown as SimulationPlayer;
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

describe("registerSimulationRoutes", () => {
  it("registers playback control and stream routes", () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    expect(() => registerSimulationRoutes(router, dependencies)).not.toThrow();

    const paths = routes.map((route) => `${route.method} ${route.path}`);
    expect(paths).toEqual(
      expect.arrayContaining([
        `POST ${SIMULATION_START_PATH}`,
        `POST ${SIMULATION_PAUSE_PATH}`,
        `POST ${SIMULATION_STOP_PATH}`,
        `GET ${SIMULATION_STREAM_PATH}`,
      ]),
    );
  });

  it("publishes start messages and resolves with acknowledgement payload", async () => {
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

    registerSimulationRoutes(router, dependencies);

    const startRoute = findRoute(routes, SIMULATION_START_PATH, "POST");
    const result = await startRoute.handler(createContext({ body: {} }));

    expect(inboundMessages).toHaveLength(1);
    expect(inboundMessages[0].type).toBe(SIMULATION_START_MESSAGE);
    expect(result).toMatchObject({
      status: 200,
      body: {
        acknowledgement: expect.objectContaining({ status: "success" }),
      },
    });
  });

  it("streams outbound frames to Server-Sent Event clients", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();
    registerSimulationRoutes(router, dependencies);

    const streamRoute = findRoute(routes, SIMULATION_STREAM_PATH, "GET");
    const response = createSseResponse();

    await streamRoute.handler(
      createContext({
        response,
      }),
    );

    dependencies.outboundBus.publish({
      type: "frame",
      frame: { tick: 42, entities: [] },
    });

    expect(response.setHeader).toHaveBeenCalledWith("content-type", "text/event-stream");
    expect(response.write).toHaveBeenCalledWith(expect.stringContaining("\"tick\":42"));
    expect(response.end).not.toHaveBeenCalled();
  });
});
