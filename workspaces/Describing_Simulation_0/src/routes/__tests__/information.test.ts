import { registerInformationRoutes } from '../information';
import type { Router } from '../router';

describe('information routes', () => {
  const createRouter = () => {
    const map = new Map<string, (req: any, res: any) => unknown>();
    const router = {
      register: jest.fn((path: string, handler: (req: any, res: any) => unknown) => {
        map.set(path, handler);
      }),
    } as unknown as Router & { register: jest.Mock };

    return { router, map };
  };

  it('registers root, listing, and document endpoints', async () => {
    const { router, map } = createRouter();
    const readDocument = jest.fn(async (filename: string) => `# ${filename}`);

    const segments = [
      { id: 'simulation', title: 'Simulation', description: 'Control loop', path: '/api/simulation' },
      { id: 'evaluation', title: 'Evaluation', description: 'Inspect metrics', path: '/api/evaluation' },
    ];

    const documents = [
      { id: 'api', title: 'API', description: 'Endpoint summary', filename: '/docs/api.md' },
      {
        id: 'describing-simulation',
        title: 'Orientation',
        description: 'Key ECS notes',
        filename: '/docs/Describing_Simulation.md',
      },
    ];

    registerInformationRoutes(router, { segments, documents, readDocument });

    const rootHandler = map.get('/');
    const indexHandler = map.get('/information');
    const apiHandler = map.get('/information/api');
    const docHandler = map.get('/information/describing-simulation');

    expect(rootHandler).toBeDefined();
    expect(indexHandler).toBeDefined();
    expect(apiHandler).toBeDefined();
    expect(docHandler).toBeDefined();

    const rootRes = { json: jest.fn() };
    rootHandler?.({}, rootRes);
    expect(rootRes.json).toHaveBeenCalledWith({
      name: 'SimEval API',
      segments,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        path: `/api/information/${doc.id}`,
      })),
    });

    const indexRes = { json: jest.fn() };
    indexHandler?.({}, indexRes);
    expect(indexRes.json).toHaveBeenCalledWith({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        path: `/api/information/${doc.id}`,
      })),
    });

    const apiRes = { json: jest.fn() };
    await apiHandler?.({}, apiRes);
    expect(readDocument).toHaveBeenCalledWith('/docs/api.md');
    expect(apiRes.json).toHaveBeenCalledWith({
      id: 'api',
      title: 'API',
      description: 'Endpoint summary',
      content: '# /docs/api.md',
    });

    const docRes = { json: jest.fn() };
    await docHandler?.({}, docRes);
    expect(readDocument).toHaveBeenCalledWith('/docs/Describing_Simulation.md');
    expect(docRes.json).toHaveBeenCalledWith({
      id: 'describing-simulation',
      title: 'Orientation',
      description: 'Key ECS notes',
      content: '# /docs/Describing_Simulation.md',
    });
  });
});
