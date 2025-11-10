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

    const listDir = jest.fn(async () => ['fileA.ts']);
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
    expect(treeRes.json).toHaveBeenCalledWith({ entries: ['fileA.ts'] });

    const fileRes = createAsyncRes();
    await fileHandler?.({ query: { path: 'src/fileA.ts' } }, fileRes);
    expect(readFile).toHaveBeenCalledWith('/repo', 'src/fileA.ts');
    expect(fileRes.json).toHaveBeenCalledWith({ content: 'file-content' });

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
});

function createAsyncRes() {
  return {
    json: jest.fn().mockResolvedValue(undefined),
  };
}
