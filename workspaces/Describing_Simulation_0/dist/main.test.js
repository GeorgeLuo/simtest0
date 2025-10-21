import { afterEach, describe, expect, it, vi } from "vitest";
import * as mainModule from "./main.js";
import { createServer } from "./main.js";
import { Server } from "./server/Server.js";
import { SimulationPlayer } from "./core/simplayer/SimulationPlayer.js";
import { EvaluationPlayer } from "./core/evalplayer/EvaluationPlayer.js";
import { Router } from "./routes/router.js";
afterEach(() => {
    vi.restoreAllMocks();
});
describe("createServer", () => {
    it("builds a server with default configuration and player/router dependencies", () => {
        const server = createServer();
        expect(server).toBeInstanceOf(Server);
        expect(server.getConfig()).toMatchObject({ port: 3000, host: "0.0.0.0" });
        expect(server.getSimulationPlayer()).toBeInstanceOf(SimulationPlayer);
        expect(server.getEvaluationPlayer()).toBeInstanceOf(EvaluationPlayer);
        expect(server.getRouter()).toBeInstanceOf(Router);
    });
    it("accepts configuration overrides", () => {
        const server = createServer({ port: 8080, host: "127.0.0.1" });
        expect(server.getConfig()).toMatchObject({ port: 8080, host: "127.0.0.1" });
    });
});
describe("main", () => {
    it("creates and starts a server instance", async () => {
        const start = vi.fn().mockResolvedValue(undefined);
        const stop = vi.fn();
        const fakeServer = {
            start,
            stop,
        };
        vi.spyOn(mainModule, "createServer").mockReturnValue(fakeServer);
        await expect(mainModule.main()).resolves.toBeUndefined();
        expect(start).toHaveBeenCalled();
    });
    it("propagates startup failures", async () => {
        const start = vi.fn().mockRejectedValue(new Error("boot failure"));
        const fakeServer = {
            start,
            stop: vi.fn(),
        };
        vi.spyOn(mainModule, "createServer").mockReturnValue(fakeServer);
        await expect(mainModule.main()).rejects.toThrow("boot failure");
    });
});
