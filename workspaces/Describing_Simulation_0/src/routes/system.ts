import { Router } from "./router.js";

export const SYSTEM_HEALTH_PATH = "/health";
export const SYSTEM_STATUS_PATH = "/status";

export interface SystemRouteDependencies {
  readonly collectHealth: () => Promise<unknown> | unknown;
  readonly collectStatus: () => Promise<unknown> | unknown;
}

export function registerSystemRoutes(
  router: Router,
  dependencies: SystemRouteDependencies,
): void {
  router.register({
    method: "GET",
    path: SYSTEM_HEALTH_PATH,
    handler: async () => {
      try {
        const snapshot = await dependencies.collectHealth();
        return {
          status: 200,
          body: snapshot,
        };
      } catch (error) {
        return {
          status: 500,
          body: errorBody(error),
        };
      }
    },
  });

  router.register({
    method: "GET",
    path: SYSTEM_STATUS_PATH,
    handler: async () => {
      try {
        const snapshot = await dependencies.collectStatus();
        return {
          status: 200,
          body: snapshot,
        };
      } catch (error) {
        return {
          status: 500,
          body: errorBody(error),
        };
      }
    },
  });
}

function errorBody(error: unknown): { error: string } {
  return {
    error: error instanceof Error ? error.message : "Unknown system error",
  };
}
