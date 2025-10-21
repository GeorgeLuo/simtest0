import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Server, ServerConfig } from "../Server.js";
import { Router } from "../../routes/router.js";
import { SimulationPlayer } from "../../core/simplayer/SimulationPlayer.js";
import { EvaluationPlayer } from "../../core/evalplayer/EvaluationPlayer.js";

const listenMock = vi.fn();
const closeMock = vi.fn();

vi.mock("node:http", () => ({
  createServer: vi.fn(() => ({
    listen: listenMock,
    close: closeMock,
  })),
}));

const createRouter = () => {
  const listener = vi.fn();
  const router = {
    createListener: vi.fn(() => listener),
    register: vi.fn(),
    getRoutes: vi.fn(),
  } as unknown as Router & { createListener: ReturnType<typeof vi.fn> };
  return { router, listener };
};

const createPlayers = () => ({
  simulationPlayer: {
    dispose: vi.fn(),
  } as unknown as SimulationPlayer,
  evaluationPlayer: {
    dispose: vi.fn(),
  } as unknown as EvaluationPlayer,
});

const createServerInstance = (config: ServerConfig = { port: 3000 }) => {
  const { router, listener } = createRouter();
  const players = createPlayers();
  const server = new Server(config, {
    router,
    simulationPlayer: players.simulationPlayer,
    evaluationPlayer: players.evaluationPlayer,
  });
  return { server, router, listener, players };
};

beforeEach(() => {
  listenMock.mockImplementation((_port: number, _host: string | undefined, callback?: () => void) => {
    callback?.();
  });
  closeMock.mockImplementation((callback?: (error?: Error | null) => void) => {
    callback?.();
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Server", () => {
  it("starts an HTTP listener using the router's handler", async () => {
    const { server, listener } = createServerInstance({ port: 4321, host: "127.0.0.1" });

    await server.start();

    const http = await import("node:http");
    expect(http.createServer).toHaveBeenCalledWith(listener);
    expect(listenMock).toHaveBeenCalledWith(4321, "127.0.0.1", expect.any(Function));
  });

  it("ignores repeated start calls once listening", async () => {
    const { server } = createServerInstance();

    await server.start();
    await server.start();

    expect(listenMock).toHaveBeenCalledTimes(1);
  });

  it("closes the listener and disposes players on stop", async () => {
    const { server, players } = createServerInstance();

    await server.start();
    await server.stop();

    expect(closeMock).toHaveBeenCalledWith(expect.any(Function));
    expect(players.simulationPlayer.dispose).toHaveBeenCalled();
    expect(players.evaluationPlayer.dispose).toHaveBeenCalled();
  });

  it("exposes configuration and router via getters", () => {
    const { server, router } = createServerInstance({ port: 5000 });

    expect(server.getConfig().port).toBe(5000);
    expect(server.getRouter()).toBe(router);
  });
});
