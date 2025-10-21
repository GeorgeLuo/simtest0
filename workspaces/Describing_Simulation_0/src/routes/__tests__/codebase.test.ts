import { describe, expect, it, vi } from "vitest";
import {
  CODEBASE_FILE_PATH,
  CODEBASE_PLUGIN_PATH,
  CODEBASE_TREE_PATH,
  CodebaseRouteDependencies,
  registerCodebaseRoutes,
} from "../codebase.js";
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

const createDirent = (name: string, type: "file" | "directory") => ({
  name,
  isDirectory: () => type === "directory",
  isFile: () => type === "file",
});

const createDependencies = (): CodebaseRouteDependencies & {
  fs: CodebaseRouteDependencies["fs"];
} => {
  const fs = {
    readFile: vi.fn(async () => "// source"),
    writeFile: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    readdir: vi.fn(async () => [] as ReturnType<typeof createDirent>[]),
    stat: vi.fn(async () => ({ isDirectory: () => false, isFile: () => true })),
  } satisfies CodebaseRouteDependencies["fs"];

  const path = {
    resolve: (...segments: string[]) => segments.join("/"),
    join: (...segments: string[]) => segments.join("/"),
    normalize: (value: string) => value.replace(/\\/g, "/"),
  };

  return {
    rootDirectory: "/project",
    pluginDirectory: "/project/plugins",
    fs,
    path,
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

describe("registerCodebaseRoutes", () => {
  it("registers tree, file, and plugin routes", () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    expect(() => registerCodebaseRoutes(router, dependencies)).not.toThrow();

    const paths = routes.map((route) => `${route.method} ${route.path}`);
    expect(paths).toEqual(
      expect.arrayContaining([
        `GET ${CODEBASE_TREE_PATH}`,
        `GET ${CODEBASE_FILE_PATH}`,
        `POST ${CODEBASE_PLUGIN_PATH}`,
      ]),
    );
  });

  it("returns a recursive directory tree", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    dependencies.fs.readdir = vi.fn(async (path: string) => {
      if (path === "/project") {
        return [createDirent("src", "directory"), createDirent("package.json", "file")];
      }
      if (path === "/project/src") {
        return [createDirent("index.ts", "file")];
      }
      return [];
    });

    registerCodebaseRoutes(router, dependencies);

    const treeRoute = findRoute(routes, CODEBASE_TREE_PATH, "GET");
    const result = await treeRoute.handler(createContext());

    expect(result).toMatchObject({ status: 200 });
    const body = result?.body as { entries: Array<{ name: string; type: string; children?: unknown[] }> };
    expect(body.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "src", type: "directory" }),
        expect.objectContaining({ name: "package.json", type: "file" }),
      ]),
    );
  });

  it("reads file contents at requested path", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();
    const readFileMock = dependencies.fs.readFile as unknown as ReturnType<typeof vi.fn>;
    readFileMock.mockResolvedValueOnce("console.log('hi');");

    registerCodebaseRoutes(router, dependencies);

    const fileRoute = findRoute(routes, CODEBASE_FILE_PATH, "GET");
    const result = await fileRoute.handler(
      createContext({
        query: { path: "src/index.ts" },
      }),
    );

    expect(dependencies.fs.readFile).toHaveBeenCalledWith("/project/src/index.ts", "utf-8");
    expect(result).toMatchObject({
      status: 200,
      body: { path: "src/index.ts", content: "console.log('hi');" },
    });
  });

  it("writes plugin uploads under the plugin directory", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    registerCodebaseRoutes(router, dependencies);

    const pluginRoute = findRoute(routes, CODEBASE_PLUGIN_PATH, "POST");
    const result = await pluginRoute.handler(
      createContext({
        body: {
          path: "simulation/systems/new-system.ts",
          content: "export const system = {};",
        },
      }),
    );

    expect(dependencies.fs.mkdir).toHaveBeenCalledWith("/project/plugins/simulation/systems", { recursive: true });
    expect(dependencies.fs.writeFile).toHaveBeenCalledWith(
      "/project/plugins/simulation/systems/new-system.ts",
      "export const system = {};",
    );
    expect(result).toMatchObject({
      status: 201,
      body: { path: "simulation/systems/new-system.ts" },
    });
  });

  it("rejects plugin uploads that escape the plugin directory", async () => {
    const { router, routes } = createRouterCapture();
    const dependencies = createDependencies();

    registerCodebaseRoutes(router, dependencies);

    const pluginRoute = findRoute(routes, CODEBASE_PLUGIN_PATH, "POST");
    const result = await pluginRoute.handler(
      createContext({
        body: {
          path: "../etc/passwd",
          content: "",
        },
      }),
    );

    expect(result).toMatchObject({
      status: 400,
      body: { error: expect.stringContaining("outside plugin directory") },
    });
    expect(dependencies.fs.writeFile).not.toHaveBeenCalled();
  });
});
