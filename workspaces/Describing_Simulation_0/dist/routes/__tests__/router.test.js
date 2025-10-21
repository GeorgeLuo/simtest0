import { describe, expect, it, vi } from "vitest";
import { Router } from "../router.js";
const createResponseStub = () => {
    const headers = {};
    return {
        statusCode: 200,
        headers,
        setHeader: (key, value) => {
            headers[key.toLowerCase()] = value;
        },
        end: vi.fn(),
    };
};
const listenerInvoke = async (listener, request, response) => {
    expect(typeof listener).toBe("function");
    const handler = listener;
    await handler(request, response);
};
describe("Router", () => {
    it("registers routes without mutating prior snapshots", () => {
        const router = new Router();
        const handlerA = vi.fn();
        const handlerB = vi.fn();
        router.register({ method: "GET", path: "/a", handler: handlerA });
        router.register({ method: "POST", path: "/b", handler: handlerB });
        const snapshotA = router.getRoutes();
        expect(snapshotA).toHaveLength(2);
        expect(snapshotA[0]).toMatchObject({ method: "GET", path: "/a", handler: handlerA });
        const snapshotB = router.getRoutes();
        expect(snapshotB).not.toBe(snapshotA);
        expect(snapshotB[1]).toMatchObject({ method: "POST", path: "/b", handler: handlerB });
        snapshotA.push({ method: "DELETE", path: "/c", handler: () => undefined });
        const snapshotC = router.getRoutes();
        expect(snapshotC).toHaveLength(2);
    });
    it("dispatches requests to matching handler with params and query", async () => {
        const router = new Router();
        const capturedContexts = [];
        const handlerMock = vi.fn((context) => {
            capturedContexts.push(context);
            return {
                status: 200,
                body: { ok: true },
            };
        });
        const handler = (context) => handlerMock(context);
        router.register({
            method: "GET",
            path: "/resource/:id",
            handler,
        });
        const listener = router.createListener();
        const response = createResponseStub();
        await listenerInvoke(listener, { method: "GET", url: "/resource/123?filter=latest" }, response);
        expect(handlerMock).toHaveBeenCalledTimes(1);
        const context = capturedContexts[0];
        expect(context.params).toEqual({ id: "123" });
        expect(context.query).toEqual({ filter: "latest" });
        expect(response.statusCode).toBe(200);
        expect(response.headers["content-type"]).toBe("application/json");
        expect(response.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
    });
    it("responds with 404 for missing route", async () => {
        const router = new Router();
        const listener = router.createListener();
        const response = createResponseStub();
        await listenerInvoke(listener, { method: "GET", url: "/missing" }, response);
        expect(response.statusCode).toBe(404);
        expect(response.headers["content-type"]).toBe("application/json");
        expect(response.end).toHaveBeenCalledWith(expect.stringContaining("not found"));
    });
    it("wraps handler errors into 500 responses", async () => {
        const router = new Router();
        router.register({
            method: "POST",
            path: "/explode",
            handler: () => {
                throw new Error("boom");
            },
        });
        const listener = router.createListener();
        const response = createResponseStub();
        await listenerInvoke(listener, { method: "POST", url: "/explode" }, response);
        expect(response.statusCode).toBe(500);
        expect(response.headers["content-type"]).toBe("application/json");
        expect(response.end).toHaveBeenCalledWith(expect.stringContaining("boom"));
    });
    it("leaves response open when handler manages streaming manually", async () => {
        const router = new Router();
        let invoked = false;
        const handler = () => {
            // handler intentionally returns void to signal manual streaming
            invoked = true;
        };
        router.register({
            method: "GET",
            path: "/stream",
            handler,
        });
        const listener = router.createListener();
        const response = createResponseStub();
        await listenerInvoke(listener, { method: "GET", url: "/stream" }, response);
        expect(invoked).toBe(true);
        expect(response.end).not.toHaveBeenCalled();
    });
});
