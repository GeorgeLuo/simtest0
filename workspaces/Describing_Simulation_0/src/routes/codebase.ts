import path from 'path';
import type { Router } from './router';

const EXCLUDED_PATH_SEGMENTS = new Set(['node_modules', '.git', '.hg', '.svn', '.turbo', '.next', '.cache']);
const ALLOWED_PLUGIN_DIRECTORIES = new Set([
  'plugins/simulation/systems',
  'plugins/simulation/components',
  'plugins/evaluation/systems',
  'plugins/evaluation/components',
]);

export interface CodebaseTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  entries?: CodebaseTreeEntry[];
}

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
  const buildDirectoryTree = async (relativePath: string, seed?: string[]): Promise<CodebaseTreeEntry> => {
    const entries = filterExcludedEntries(relativePath, seed ?? (await deps.listDir(deps.rootDir, relativePath || '.')));
    const children: CodebaseTreeEntry[] = [];

    for (const entry of entries) {
      const isDirectory = entry.endsWith('/');
      const entryName = isDirectory ? entry.slice(0, -1) : entry;
      const childRelative = relativePath ? `${relativePath}/${entryName}` : entryName;

      if (shouldExcludePath(childRelative)) {
        continue;
      }

      if (isDirectory) {
        const childTree = await buildDirectoryTree(childRelative);
        children.push(childTree);
      } else {
        children.push({
          name: entryName,
          path: formatResponsePath(childRelative),
          type: 'file',
        });
      }
    }

    return {
      name: relativePath ? basename(relativePath) : '.',
      path: formatResponsePath(relativePath || '.'),
      type: 'directory',
      entries: children,
    };
  };

  router.register('/codebase/tree', async (req: any, res: any) => {
    const relativePath = normalizeRelativePath(req.query?.path);

    if (shouldExcludePath(relativePath)) {
      res.statusCode = 400;
      res.json?.({ status: 'error', detail: 'Path is excluded from tree responses' });
      return;
    }

    try {
      const entries = filterExcludedEntries(
        relativePath,
        await deps.listDir(deps.rootDir, relativePath || '.'),
      );
      const tree = await buildDirectoryTree(relativePath, entries);
      res.json?.({
        path: formatResponsePath(relativePath || '.'),
        entries,
        tree,
      });
    } catch (error) {
      respondFilesystemError(res, error);
    }
  });

  router.register('/codebase/file', async (req: any, res: any) => {
    const relativePath = normalizeRelativePath(req.query?.path);
    if (!relativePath) {
      res.statusCode = 400;
      res.json?.({ status: 'error', detail: 'Path query parameter is required' });
      return;
    }

    try {
      const content = await deps.readFile(deps.rootDir, relativePath);
      res.json?.({ path: formatResponsePath(relativePath), content });
    } catch (error) {
      respondFilesystemError(res, error);
    }
  });

  router.register('/codebase/plugin', async (req: any, res: any) => {
    const messageId = typeof req.body?.messageId === 'string' ? req.body.messageId : undefined;
    const requestedPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content : undefined;
    const overwrite = Boolean(req.body?.overwrite);

    const sanitizedPath = normalizePluginPath(requestedPath);
    if (!sanitizedPath) {
      respondPluginError(res, messageId, 'Missing plugin path');
      return;
    }

    if (!sanitizedPath.startsWith('plugins/')) {
      respondPluginError(res, messageId, 'Plugins must be written under the plugins/ directory');
      return;
    }

    const pluginDir = path.posix.dirname(sanitizedPath);
    if (!ALLOWED_PLUGIN_DIRECTORIES.has(pluginDir)) {
      respondPluginError(res, messageId, 'Plugins may only be written to system or component directories');
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

function normalizeRelativePath(candidate: unknown): string {
  if (typeof candidate !== 'string') {
    return '';
  }

  const trimmed = candidate.trim();
  if (!trimmed || trimmed === '.' || trimmed === './') {
    return '';
  }

  return trimmed.replace(/^[/\\]+/, '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function normalizePluginPath(candidate: unknown): string {
  if (typeof candidate !== 'string') {
    return '';
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return '';
  }

  const sanitized = trimmed.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  const normalized = path.posix.normalize(sanitized);
  if (!normalized || normalized === '.') {
    return '';
  }

  return normalized.replace(/\/+$/, '');
}

function formatResponsePath(relativePath: string): string {
  if (!relativePath || relativePath === '.') {
    return '.';
  }
  return relativePath.replace(/\\/g, '/');
}

function basename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized) {
    return '.';
  }

  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

function respondFilesystemError(res: any, error: unknown): void {
  const { statusCode, detail } = mapFilesystemError(error);
  res.statusCode = statusCode;
  res.json?.({ status: 'error', detail });
}

function mapFilesystemError(
  error: unknown,
): {
  statusCode: number;
  detail: string;
} {
  const enoent = (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
  const detail =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Filesystem error';

  if (enoent) {
    return { statusCode: 404, detail: 'Path not found' };
  }

  if (detail.includes('not a directory') || detail.includes('not a file')) {
    return { statusCode: 400, detail };
  }

  return { statusCode: 500, detail };
}

function shouldExcludePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return false;
  }

  return normalized.split('/').some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment));
}

function filterExcludedEntries(basePath: string, entries: string[]): string[] {
  return entries.filter((entry) => {
    const entryName = entry.endsWith('/') ? entry.slice(0, -1) : entry;
    const combined = basePath ? `${basePath}/${entryName}` : entryName;
    return !shouldExcludePath(combined);
  });
}
