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

    expect(() => registerCodebaseRoutes(router, { rootDir: '/repo', listDir, readFile })).not.toThrow();

    const treeHandler = map.get('/codebase/tree');
    const fileHandler = map.get('/codebase/file');
    expect(treeHandler).toBeDefined();
    expect(fileHandler).toBeDefined();

    const treeRes = createAsyncRes();
    await treeHandler?.({ query: { path: 'src' } }, treeRes);
    expect(listDir).toHaveBeenCalledWith('/repo', 'src');
    expect(treeRes.json).toHaveBeenCalledWith({ entries: ['fileA.ts'] });

    const fileRes = createAsyncRes();
    await fileHandler?.({ query: { path: 'src/fileA.ts' } }, fileRes);
    expect(readFile).toHaveBeenCalledWith('/repo', 'src/fileA.ts');
    expect(fileRes.json).toHaveBeenCalledWith({ content: 'file-content' });
  });
});

function createAsyncRes() {
  return {
    json: jest.fn().mockResolvedValue(undefined),
  };
}
