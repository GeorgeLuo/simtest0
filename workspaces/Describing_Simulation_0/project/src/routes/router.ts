import type { IncomingMessage, ServerResponse } from 'http';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

interface RouteDefinition {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: RouteHandler;
}

function extractPath(request: IncomingMessage): string | null {
  if (!request.url) {
    return null;
  }

  try {
    const url = new URL(request.url, 'http://localhost');
    return url.pathname;
  } catch (error) {
    return null;
  }
}

export class Router {
  private readonly routes: RouteDefinition[] = [];

  add(method: HttpMethod, path: string, handler: RouteHandler): void {
    this.routes.push({ method, path, handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;
    const path = extractPath(req);

    if (!path) {
      sendJson(res, 400, { error: 'Invalid request URL.' });
      return;
    }

    const route = this.routes.find(
      (definition) => definition.method === method && definition.path === path,
    );

    if (!route) {
      sendJson(res, 404, { error: 'Not found.' });
      return;
    }

    try {
      await route.handler(req, res);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unhandled route error:', error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Internal server error.' });
      } else {
        res.end();
      }
    }
  }
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export async function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const body = await readRequestBody(req);

  if (body.length === 0) {
    return {} as T;
  }

  try {
    return JSON.parse(body.toString('utf8')) as T;
  } catch (error) {
    throw new Error('Invalid JSON payload.');
  }
}
