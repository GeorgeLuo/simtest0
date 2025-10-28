import type { Router } from './router';

export interface CodebaseRouteDeps {
  rootDir: string;
  listDir: (rootDir: string, relativePath: string) => Promise<string[]>;
  readFile: (rootDir: string, relativePath: string) => Promise<string>;
}

export function registerCodebaseRoutes(router: Router, deps: CodebaseRouteDeps): void {
  router.register('/codebase/tree', async (req: any, res: any) => {
    const relativePath = typeof req.query?.path === 'string' ? req.query.path : '';
    const entries = await deps.listDir(deps.rootDir, relativePath);
    await res.json?.({ entries });
  });

  router.register('/codebase/file', async (req: any, res: any) => {
    const relativePath = typeof req.query?.path === 'string' ? req.query.path : '';
    const content = await deps.readFile(deps.rootDir, relativePath);
    await res.json?.({ content });
  });
}
