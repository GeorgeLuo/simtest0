import type { Router } from './router';

export interface InformationSegment {
  id: string;
  title: string;
  description: string;
  path: string;
}

export interface InformationDocument {
  id: string;
  title: string;
  description: string;
  filename: string;
}

export interface InformationRouteDeps {
  segments: InformationSegment[];
  documents: InformationDocument[];
  readDocument: (filename: string) => Promise<string>;
}

export function registerInformationRoutes(router: Router, deps: InformationRouteDeps): void {
  const serializeDocument = (doc: InformationDocument) => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    path: `/api/information/${doc.id}`,
  });

  router.register('/', (_req: unknown, res: any) => {
    res.json?.({
      name: 'SimEval API',
      segments: deps.segments.map((segment) => ({
        id: segment.id,
        title: segment.title,
        description: segment.description,
        path: segment.path,
      })),
      documents: deps.documents.map(serializeDocument),
    });
  });

  router.register('/information', (_req: unknown, res: any) => {
    res.json?.({
      documents: deps.documents.map(serializeDocument),
    });
  });

  for (const doc of deps.documents) {
    router.register(`/information/${doc.id}`, async (_req: unknown, res: any) => {
      const content = await deps.readDocument(doc.filename);
      res.json?.({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        content,
      });
    });
  }
}
