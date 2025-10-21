import { URL } from "node:url";
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export class Router {
    routes = [];
    register(route) {
        this.routes.push({
            definition: route,
            matchPath: createPathMatcher(route.path),
        });
    }
    getRoutes() {
        return this.routes.map((registered) => ({
            ...registered.definition,
        }));
    }
    createListener() {
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
                const context = {
                    request,
                    response,
                    ...(matched && Object.keys(matched.params).length > 0
                        ? { params: matched.params }
                        : {}),
                    ...(Object.keys(query).length > 0 ? { query } : {}),
                    ...(body !== undefined ? { body } : {}),
                };
                const result = await Promise.resolve(registeredRoute.definition.handler(context));
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
                const payload = typeof result.body === "string"
                    ? result.body
                    : JSON.stringify(result.body);
                response.end(payload);
            }
            catch (error) {
                if (response.writableEnded) {
                    return;
                }
                const message = error instanceof Error ? error.message : "Unknown route error";
                this.respondJson(response, 500, { error: message });
            }
        };
    }
    findRoute(method, pathname) {
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
    respondJson(response, status, payload) {
        if (response.writableEnded) {
            return;
        }
        response.statusCode = status;
        ensureJsonHeader(response);
        const body = typeof payload === "string" ? payload : JSON.stringify(payload);
        response.end(body);
    }
}
function createPathMatcher(path) {
    if (path === "/") {
        return (pathname) => (pathname === "/" ? { params: {} } : null);
    }
    const paramNames = [];
    const pattern = path.replace(/:([A-Za-z0-9_]+)/g, (_substring, name) => {
        paramNames.push(name);
        return "([^/]+)";
    });
    const matcher = new RegExp(`^${pattern}$`);
    return (pathname) => {
        const match = matcher.exec(pathname);
        if (!match) {
            return null;
        }
        const params = {};
        paramNames.forEach((name, index) => {
            params[name] = decodeURIComponent(match[index + 1]);
        });
        return { params };
    };
}
function buildQueryObject(searchParams) {
    const query = {};
    for (const key of searchParams.keys()) {
        const values = searchParams.getAll(key).map((value) => value);
        query[key] = values.length > 1 ? values : values[0];
    }
    return query;
}
function ensureJsonHeader(response) {
    const existing = typeof response.getHeader === "function"
        ? response.getHeader("content-type")
        : undefined;
    if (!existing) {
        response.setHeader("content-type", "application/json");
    }
}
async function parseBody(request) {
    if (typeof request[Symbol.asyncIterator] !== "function") {
        return undefined;
    }
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
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
        }
        catch {
            return raw;
        }
    }
    return raw;
}
function normalizeMethod(method) {
    if (!method) {
        return null;
    }
    const upper = method.toUpperCase();
    if (["GET", "POST", "DELETE", "PUT", "PATCH"].includes(upper)) {
        return upper;
    }
    return null;
}
