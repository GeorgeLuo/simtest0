import type { Router, RouteHandler as RouterHandler } from "./router";

export type CodebaseEntryType = "file" | "directory";

export interface CodebaseEntry {
  path: string;
  type: CodebaseEntryType;
  size?: number;
}

export interface CodebaseRouteContext {
  listEntries(dir?: string): Promise<CodebaseEntry[]>;
  readFile(path: string): Promise<{ content: string; size: number }>;
}

export interface CodebaseRouteDefinition {
  method: string;
  path: string;
  handler: RouterHandler;
}

export function codebaseRouteDefinitions(context: CodebaseRouteContext): CodebaseRouteDefinition[] {
  return [
    {
      method: "GET",
      path: "/codebase",
      handler: async (_req, res, params) => {
        const dir = params.url.searchParams.get("dir") || undefined;
        const entries = await context.listEntries(dir);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ entries }));
      },
    },
    {
      method: "GET",
      path: "/codebase/file",
      handler: async (_req, res, params) => {
        const filePath = params.url.searchParams.get("path");
        if (!filePath) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing path query parameter" }));
          return;
        }

        try {
          const file = await context.readFile(filePath);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ file }));
        } catch (error) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      },
    },
  ];
}

export function registerCodebaseRoutes(router: Router, context: CodebaseRouteContext): void {
  for (const route of codebaseRouteDefinitions(context)) {
    router.register(route.method, route.path, route.handler);
  }
}
