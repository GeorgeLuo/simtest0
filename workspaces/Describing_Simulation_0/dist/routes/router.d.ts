import { IncomingMessage, ServerResponse } from "node:http";
export type HttpMethod = "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
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
export type RouteHandler = ((context: RouteContext) => Promise<RouteResponse | void>) | ((context: RouteContext) => RouteResponse | void);
export interface RouteDefinition {
    readonly method: HttpMethod;
    readonly path: string;
    readonly handler: RouteHandler;
    readonly description?: string;
}
type RequestListener = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;
export declare class Router {
    private readonly routes;
    register(route: RouteDefinition): void;
    getRoutes(): RouteDefinition[];
    createListener(): RequestListener;
    private findRoute;
    private respondJson;
}
export {};
