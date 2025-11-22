import { registerCodebaseRoutes } from '../codebase';
import type { Router } from '../router';

describe('codebase routes', () => {
  it('registers tree and file endpoints using provided file system', async () => {
    const map = new Map<string, (req: any, res: any) => unknown>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => unknown) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };

    const listDir = jest.fn(async (_root: string, relative: string) => {
      if (relative === 'src') {
        return ['components/', 'index.ts'];
      }
      if (relative === 'src/components') {
        return ['Button.tsx'];
      }
      throw new Error(`Unexpected path: ${relative}`);
    });
    const readFile = jest.fn(async () => 'file-content');
    const writeFile = jest.fn(async () => undefined);

    expect(() =>
      registerCodebaseRoutes(router, { rootDir: '/repo', listDir, readFile, writeFile }),
    ).not.toThrow();

    const treeHandler = map.get('/codebase/tree');
    const fileHandler = map.get('/codebase/file');
    const pluginHandler = map.get('/codebase/plugin');
    expect(treeHandler).toBeDefined();
    expect(fileHandler).toBeDefined();
    expect(pluginHandler).toBeDefined();

    const treeRes = createAsyncRes();
    await treeHandler?.({ query: { path: 'src' } }, treeRes);
    expect(listDir).toHaveBeenCalledWith('/repo', 'src');
    expect(treeRes.json).toHaveBeenCalledWith({
      path: 'src',
      entries: ['components/', 'index.ts'],
      tree: {
        name: 'src',
        path: 'src',
        type: 'directory',
        entries: [
          {
            name: 'components',
            path: 'src/components',
            type: 'directory',
            entries: [
              {
                name: 'Button.tsx',
                path: 'src/components/Button.tsx',
                type: 'file',
              },
            ],
          },
          {
            name: 'index.ts',
            path: 'src/index.ts',
            type: 'file',
          },
        ],
      },
    });

    const fileRes = createAsyncRes();
    await fileHandler?.({ query: { path: 'src/fileA.ts' } }, fileRes);
    expect(readFile).toHaveBeenCalledWith('/repo', 'src/fileA.ts');
    expect(fileRes.json).toHaveBeenCalledWith({ path: 'src/fileA.ts', content: 'file-content' });

    const pluginRes = createAsyncRes();
    await pluginHandler?.(
      { body: { messageId: 'plugin-1', path: 'plugins/System.js', content: 'export {};' } },
      pluginRes,
    );
    expect(writeFile).toHaveBeenCalledWith('/repo', 'plugins/System.js', 'export {};', { overwrite: false });
    expect(pluginRes.json).toHaveBeenCalledWith({
      status: 'success',
      messageId: 'plugin-1',
      path: 'plugins/System.js',
    });

    const invalidRes = { json: jest.fn(), statusCode: 200 };
    await pluginHandler?.({ body: { path: '../System.js', content: 'bad' } }, invalidRes);
    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.json).toHaveBeenCalledWith({
      status: 'error',
      messageId: undefined,
      detail: 'Plugins must be written under the plugins/ directory',
    });
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it('returns descriptive errors for invalid tree or file paths', async () => {
    const map = new Map<string, (req: any, res: any) => unknown>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => unknown) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };

    const missingError = Object.assign(new Error('missing path'), { code: 'ENOENT' });
    const listDir = jest.fn(async () => {
      throw missingError;
    });
    const readFile = jest.fn(async () => {
      throw new Error('Path is not a file: src');
    });
    const writeFile = jest.fn(async () => undefined);

    registerCodebaseRoutes(router, { rootDir: '/repo', listDir, readFile, writeFile });

    const treeHandler = map.get('/codebase/tree');
    const treeRes = { json: jest.fn(), statusCode: 200 };
    await treeHandler?.({ query: { path: 'missing' } }, treeRes);
    expect(treeRes.statusCode).toBe(404);
    expect(treeRes.json).toHaveBeenCalledWith({ status: 'error', detail: 'Path not found' });

    const fileHandler = map.get('/codebase/file');
    const missingPathRes = { json: jest.fn(), statusCode: 200 };
    await fileHandler?.({ query: {} }, missingPathRes);
    expect(missingPathRes.statusCode).toBe(400);
    expect(missingPathRes.json).toHaveBeenCalledWith({
      status: 'error',
      detail: 'Path query parameter is required',
    });

    const invalidFileRes = { json: jest.fn(), statusCode: 200 };
    await fileHandler?.({ query: { path: 'src' } }, invalidFileRes);
    expect(invalidFileRes.statusCode).toBe(400);
    expect(invalidFileRes.json).toHaveBeenCalledWith({
      status: 'error',
      detail: 'Path is not a file: src',
    });
  });
});

function createAsyncRes() {
  return {
    json: jest.fn().mockResolvedValue(undefined),
  };
}
