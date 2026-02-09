import type { Router } from './router';
import type { PlayerStatus } from '@simeval/ecs';

interface StatusProvider {
  describe: () => PlayerStatus;
}

interface SystemRouteDeps {
  getUptimeMs: () => number;
  version: string;
  simulation: StatusProvider;
  evaluation: StatusProvider;
}

export function registerSystemRoutes(router: Router, deps: SystemRouteDeps): void {
  router.register('/health', (_req, res) => {
    const response = res as { json?: (body: unknown) => void };
    response.json?.({
      status: 'success',
      version: deps.version,
      ready: true,
      uptimeMs: deps.getUptimeMs(),
      timestamp: new Date().toISOString(),
    });
  });

  router.register('/status', (_req, res) => {
    const response = res as { json?: (body: unknown) => void };
    response.json?.({
      status: 'success',
      simulation: deps.simulation.describe(),
      evaluation: deps.evaluation.describe(),
    });
  });
}
