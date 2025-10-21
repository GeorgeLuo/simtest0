import { Router } from "./router.js";
export declare const SYSTEM_HEALTH_PATH = "/health";
export declare const SYSTEM_STATUS_PATH = "/status";
export interface SystemRouteDependencies {
    readonly collectHealth: () => Promise<unknown> | unknown;
    readonly collectStatus: () => Promise<unknown> | unknown;
}
export declare function registerSystemRoutes(router: Router, dependencies: SystemRouteDependencies): void;
