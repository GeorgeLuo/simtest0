import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

export type RouteHandler = (req: IncomingMessage, res: ServerResponse, params: RouteParams) => Promise<void> | void;

export interface RouteParams {
  url: URL;
}

interface RouteDefinition {
  method: string;
  path: string;
  handler: RouteHandler;
}

export class Router {
  private routes: RouteDefinition[] = [];

  register(method: string, path: string, handler: RouteHandler): void {
    this.routes.push({ method: method.toUpperCase(), path, handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = (req.method ?? "GET").toUpperCase();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    const match = this.routes.find((route) => route.method === method && route.path === url.pathname);
    if (!match) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not Found" }));
      return;
    }

    try {
      await match.handler(req, res, { url });
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Internal Server Error",
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}
