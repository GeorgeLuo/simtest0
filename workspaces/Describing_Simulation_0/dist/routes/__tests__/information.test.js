import { describe, expect, it, vi } from "vitest";
import { API_DOCUMENT_PATH, ROOT_INFORMATION_PATH, SOURCE_SPEC_PATH, registerInformationRoutes, } from "../information/index.js";
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
const createDependencies = () => ({
    describingSimulationPath: "/docs/Describing_Simulation.md",
    apiDocumentPath: "/docs/api.md",
    readFile: vi.fn(async (path) => `content from ${path}`),
    metadata: {
        project: "sim-eval",
    },
});
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
describe("registerInformationRoutes", () => {
    it("registers root, spec, and api documentation routes", () => {
        const { router, routes } = createRouterCapture();
        const dependencies = createDependencies();
        expect(() => registerInformationRoutes(router, dependencies)).not.toThrow();
        const paths = routes.map((route) => `${route.method} ${route.path}`);
        expect(paths).toEqual(expect.arrayContaining([
            `GET ${ROOT_INFORMATION_PATH}`,
            `GET ${SOURCE_SPEC_PATH}`,
            `GET ${API_DOCUMENT_PATH}`,
        ]));
    });
    it("returns discoverable metadata from the root route", async () => {
        const { router, routes } = createRouterCapture();
        const dependencies = createDependencies();
        registerInformationRoutes(router, dependencies);
        const rootRoute = findRoute(routes, ROOT_INFORMATION_PATH, "GET");
        const result = await rootRoute.handler(createContext());
        expect(result).toMatchObject({ status: 200 });
        const body = result?.body;
        expect(body.segments).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: "/simulation" }),
            expect.objectContaining({ path: "/evaluation" }),
            expect.objectContaining({ path: "/codebase" }),
        ]));
        expect(body.metadata).toEqual(dependencies.metadata);
    });
    it("serves descriptive markdown documents", async () => {
        const { router, routes } = createRouterCapture();
        const dependencies = createDependencies();
        registerInformationRoutes(router, dependencies);
        const specRoute = findRoute(routes, SOURCE_SPEC_PATH, "GET");
        const apiRoute = findRoute(routes, API_DOCUMENT_PATH, "GET");
        const specResult = await specRoute.handler(createContext());
        const apiResult = await apiRoute.handler(createContext());
        expect(dependencies.readFile).toHaveBeenCalledWith("/docs/Describing_Simulation.md");
        expect(dependencies.readFile).toHaveBeenCalledWith("/docs/api.md");
        expect(specResult).toMatchObject({ status: 200, body: { content: expect.stringContaining("Describing_Simulation") } });
        expect(apiResult).toMatchObject({ status: 200, body: { content: expect.stringContaining("api") } });
    });
});
