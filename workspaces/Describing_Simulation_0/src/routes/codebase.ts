import type { Router } from './router';

export interface CodebaseRouteDeps {
  rootDir: string;
  listDir: (rootDir: string, relativePath: string) => Promise<string[]>;
  readFile: (rootDir: string, relativePath: string) => Promise<string>;
  writeFile: (
    rootDir: string,
    relativePath: string,
    content: string,
    options?: { overwrite?: boolean },
  ) => Promise<void>;
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

  router.register('/codebase/plugin', async (req: any, res: any) => {
    const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
    const requestedPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : undefined;
    const overwrite = Boolean(req.body?.overwrite);

    const sanitizedPath = requestedPath.replace(/^[/\\]+/, '');
    if (!sanitizedPath) {
      respondPluginError(res, messageId, 'Missing plugin path');
      return;
    }

    if (!sanitizedPath.startsWith('plugins/')) {
      respondPluginError(res, messageId, 'Plugins must be written under the plugins/ directory');
      return;
    }

    if (typeof content !== 'string') {
      respondPluginError(res, messageId, 'Missing plugin content');
      return;
    }

    try {
      await deps.writeFile(deps.rootDir, sanitizedPath, content, { overwrite });
      res.json?.({ status: 'success', messageId, path: sanitizedPath });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Plugin upload failed';
      respondPluginError(res, messageId, detail);
    }
  });
}

function respondPluginError(res: any, messageId: string | undefined, detail: string): void {
  res.statusCode = 400;
  res.json?.({ status: 'error', messageId, detail });
}
