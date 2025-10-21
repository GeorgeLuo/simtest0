import { describe, expect, it, vi } from "vitest";
import { SYSTEM_HEALTH_PATH, SYSTEM_STATUS_PATH, registerSystemRoutes, } from "../system.js";
const createRouterCapture = () => {
    const routes = [];
    const router = {
        register: (definition) => {
            routes.push(definition);
        },
        getRoutes: vi.fn(),
        createListener: vi.fn(),
    };
    return { router, routes };
};
const findRoute = (routes, path, method) => {
    const route = routes.find((definition) => definition.path === path && definition.method === method);
    if (!route) {
        throw new Error(`Route ${method} ${path} not registered`);
    }
    return route;
};
const createContext = (overrides) => ({
    request: {},
    response: {},
    ...overrides,
});
describe("registerSystemRoutes", () => {
    it("registers health and status endpoints", () => {
        const { router, routes } = createRouterCapture();
        const dependencies = {
            collectHealth: vi.fn(async () => ({})),
            collectStatus: vi.fn(async () => ({})),
        };
        expect(() => registerSystemRoutes(router, dependencies)).not.toThrow();
        const paths = routes.map((route) => `${route.method} ${route.path}`);
        expect(paths).toEqual(expect.arrayContaining([
            `GET ${SYSTEM_HEALTH_PATH}`,
            `GET ${SYSTEM_STATUS_PATH}`,
        ]));
    });
    it("returns health snapshot data", async () => {
        const { router, routes } = createRouterCapture();
        const dependencies = {
            collectHealth: vi.fn(async () => ({ ok: true })),
            collectStatus: vi.fn(async () => ({ running: false })),
        };
        registerSystemRoutes(router, dependencies);
        const healthRoute = findRoute(routes, SYSTEM_HEALTH_PATH, "GET");
        const result = await healthRoute.handler(createContext());
        expect(dependencies.collectHealth).toHaveBeenCalled();
        expect(result).toMatchObject({ status: 200, body: { ok: true } });
    });
    it("wraps status collection errors", async () => {
        const { router, routes } = createRouterCapture();
        const dependencies = {
            collectHealth: vi.fn(async () => ({ ok: true })),
            collectStatus: vi.fn(async () => {
                throw new Error("status failure");
            }),
        };
        registerSystemRoutes(router, dependencies);
        const statusRoute = findRoute(routes, SYSTEM_STATUS_PATH, "GET");
        const result = await statusRoute.handler(createContext());
        expect(result).toMatchObject({ status: 500, body: { error: expect.stringContaining("status failure") } });
    });
});
