import { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";

export type HttpMethod =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "PATCH";

export interface RouteContext {
  readonly request: unknown;
  readonly response: unknown;
  readonly params?: Record<string, string>;
  readonly query?: Record<string, string | string[]>;
  readonly body?: unknown;
}

export interface RouteResponse {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}

export type RouteHandler =
  | ((context: RouteContext) => Promise<RouteResponse | void>)
  | ((context: RouteContext) => RouteResponse | void);

export interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: RouteHandler;
  readonly description?: string;
}

type RequestListener = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;

interface RegisteredRoute {
  readonly definition: RouteDefinition;
  readonly matchPath: (pathname: string) => { readonly params: Record<string, string> } | null;
}

const METHODS_WITH_BODY = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

export class Router {
  private readonly routes: RegisteredRoute[] = [];

  register(route: RouteDefinition): void {
    this.routes.push({
      definition: route,
      matchPath: createPathMatcher(route.path),
    });
  }

  getRoutes(): RouteDefinition[] {
    return this.routes.map((registered) => ({
      ...registered.definition,
    }));
  }

  createListener(): RequestListener {
    return async (request, response) => {
      const method = normalizeMethod(request.method);
      const url = request.url ?? "/";
      const parsed = new URL(url, "http://localhost");
      const pathname = parsed.pathname;

      const registeredRoute = method
        ? this.findRoute(method, pathname)
        : null;

      if (!registeredRoute) {
        this.respondJson(response, 404, { error: "Route not found" });
        return;
      }

      try {
        const query = buildQueryObject(parsed.searchParams);
        const body = METHODS_WITH_BODY.has(registeredRoute.definition.method)
          ? await parseBody(request)
          : undefined;

        const matched = registeredRoute.matchPath(pathname);
        const context: RouteContext = {
          request,
          response,
          ...(matched && Object.keys(matched.params).length > 0
            ? { params: matched.params }
            : {}),
          ...(Object.keys(query).length > 0 ? { query } : {}),
          ...(body !== undefined ? { body } : {}),
        };

        const result = await Promise.resolve(
          registeredRoute.definition.handler(context),
        );

        if (response.writableEnded) {
          return;
        }

        if (!result) {
          return;
        }

        if (result.headers) {
          for (const [header, value] of Object.entries(result.headers)) {
            response.setHeader(header, value);
          }
        }

        response.statusCode = result.status;
        ensureJsonHeader(response);

        if (result.body === undefined) {
          response.end();
          return;
        }

        const payload =
          typeof result.body === "string"
            ? result.body
            : JSON.stringify(result.body);

        response.end(payload);
      } catch (error) {
        if (response.writableEnded) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Unknown route error";
        this.respondJson(response, 500, { error: message });
      }
    };
  }

  private findRoute(
    method: HttpMethod,
    pathname: string,
  ): RegisteredRoute | null {
    for (const route of this.routes) {
      if (route.definition.method !== method) {
        continue;
      }

      if (route.matchPath(pathname)) {
        return route;
      }
    }

    return null;
  }

  private respondJson(
    response: ServerResponse,
    status: number,
    payload: unknown,
  ): void {
    if (response.writableEnded) {
      return;
    }

    response.statusCode = status;
    ensureJsonHeader(response);
    const body =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    response.end(body);
  }
}

function createPathMatcher(
  path: string,
): RegisteredRoute["matchPath"] {
  if (path === "/") {
    return (pathname) => (pathname === "/" ? { params: {} } : null);
  }

  const paramNames: string[] = [];
  const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_substring, name: string) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  const matcher = new RegExp(`^${pattern}$`);

  return (pathname) => {
    const match = matcher.exec(pathname);
    if (!match) {
      return null;
    }

    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });

    return { params };
  };
}

function buildQueryObject(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key).map((value) => value);
    query[key] = values.length > 1 ? values : values[0];
  }
  return query;
}

function ensureJsonHeader(response: ServerResponse): void {
  const existing =
    typeof response.getHeader === "function"
      ? response.getHeader("content-type")
      : undefined;
  if (!existing) {
    response.setHeader("content-type", "application/json");
  }
}

async function parseBody(
  request: IncomingMessage,
): Promise<unknown> {
  if (typeof (request as unknown as AsyncIterable<unknown>)[Symbol.asyncIterator] !== "function") {
    return undefined;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk) : chunk,
    );
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  const contentType = request.headers["content-type"] ?? "";

  if (typeof raw !== "string" || raw.length === 0) {
    return undefined;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

function normalizeMethod(method?: string | null): HttpMethod | null {
  if (!method) {
    return null;
  }

  const upper = method.toUpperCase();
  if (["GET", "POST", "DELETE", "PUT", "PATCH"].includes(upper)) {
    return upper as HttpMethod;
  }

  return null;
}
