import type { IncomingMessage, ServerResponse } from 'http';

export interface RouteHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req: unknown, res: unknown, next?: () => void): any;
}

export interface RouterOptions {
  basePath?: string;
  authToken?: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export class Router {
  private readonly basePath: string;
  private readonly routes = new Map<string, RouteHandler>();
  private readonly authToken?: string;
  private readonly rateLimit?: {
    windowMs: number;
    max: number;
  };
  private readonly hits = new Map<string, { count: number; reset: number }>();

  constructor(options: RouterOptions = {}) {
    this.basePath = normalizeBasePath(options.basePath ?? '');
    this.authToken = options.authToken;
    this.rateLimit = options.rateLimit;
  }

  register(path: string, handler: RouteHandler): void {
    const normalizedPath = this.normalizeRegisteredPath(path);
    this.routes.set(normalizedPath, handler);
  }

  dispatch(req: unknown, res: unknown): boolean {
    const url = typeof (req as { url?: unknown }).url === 'string' ? (req as { url: string }).url : '';
    const path = stripQueryAndTrailingSlash(url);
    const handler = this.routes.get(path);
    if (!handler) {
      return false;
    }

    const next = () => {
      /* no-op for now */
    };

    const incoming = isIncomingMessage(req) ? req : undefined;
    const response = isServerResponse(res) ? res : undefined;

    if (incoming) {
      attachQuery(incoming);

      if (this.authToken && !isAuthorized(incoming, this.authToken)) {
        sendError(response, 401, { status: 'error', detail: 'Unauthorized' });
        return true;
      }

      if (this.rateLimit && !this.consumeRateLimit(incoming)) {
        sendError(response, 429, { status: 'error', detail: 'Too Many Requests' });
        return true;
      }
    }

    if (response) {
      ensureJson(response);
    }

    const invokeHandler = () => {
      handler(req, res, next);
    };

    if (incoming && shouldParseBody(incoming.method)) {
      parseJsonBody(incoming)
        .then((body) => {
          (incoming as { body?: unknown }).body = body;
          invokeHandler();
        })
        .catch((error: Error) => {
          if (response) {
            if (!response.headersSent) {
              response.statusCode = 400;
              response.setHeader('Content-Type', 'application/json');
            }
            response.end(JSON.stringify({ status: 'error', detail: error.message }));
          }
        });
    } else {
      invokeHandler();
    }

    return true;
  }

  private normalizeRegisteredPath(path: string): string {
    const cleaned = ensureLeadingSlash(stripTrailingSlash(path));
    const combined = `${this.basePath}${cleaned}`;
    return combined === '' ? '/' : stripTrailingSlash(combined) || '/';
  }

  private consumeRateLimit(req: IncomingMessage): boolean {
    if (!this.rateLimit) {
      return true;
    }

    const now = Date.now();
    const key = buildRateKey(req);
    const existing = this.hits.get(key);
    const windowMs = this.rateLimit.windowMs;
    const max = this.rateLimit.max;

    if (!existing || existing.reset <= now) {
      this.hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }

    existing.count += 1;
    if (existing.count > max) {
      return false;
    }

    return true;
  }
}

function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === '/') {
    return '';
  }

  return stripTrailingSlash(ensureLeadingSlash(basePath));
}

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function stripTrailingSlash(path: string): string {
  if (path === '/') {
    return path;
  }

  return path.replace(/\/+$/, '');
}

function stripQueryAndTrailingSlash(url: string): string {
  if (!url) {
    return '/';
  }

  const [path] = url.split('?');
  const cleaned = stripTrailingSlash(path);
  return cleaned || '/';
}

function isIncomingMessage(req: unknown): req is IncomingMessage {
  return Boolean(req && typeof req === 'object' && 'headers' in (req as Record<string, unknown>));
}

function isServerResponse(res: unknown): res is ServerResponse & { json?: (body: unknown) => void } {
  return Boolean(res && typeof res === 'object' && 'setHeader' in (res as Record<string, unknown>));
}

function shouldParseBody(method: string | undefined): boolean {
  if (!method) {
    return false;
  }

  const normalized = method.toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH';
}

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk as Buffer);
    }
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
}

function attachQuery(req: unknown): void {
  const url = typeof (req as { url?: unknown }).url === 'string' ? (req as { url: string }).url : '';
  try {
    const urlObj = new URL(url, 'http://localhost');
    const query: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    (req as { query?: unknown }).query = query;
  } catch {
    (req as { query?: unknown }).query = {};
  }
}

function ensureJson(res: ServerResponse & { json?: (body: unknown) => void }): void {
  if (typeof res.json === 'function') {
    return;
  }

  res.json = (body: unknown) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    if (!res.statusCode) {
      res.statusCode = 200;
    }
    res.end(JSON.stringify(body));
  };
}

function isAuthorized(req: IncomingMessage, expectedToken: string): boolean {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') {
    return false;
  }

  const trimmed = header.trim();
  return trimmed === expectedToken || trimmed === `Bearer ${expectedToken}`;
}

function sendError(res: (ServerResponse & { json?: (body: unknown) => void }) | undefined, statusCode: number, body: unknown): void {
  if (!res) {
    return;
  }

  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
  }
  res.end(JSON.stringify(body));
}

function buildRateKey(req: IncomingMessage): string {
  const ip = extractIp(req);
  const path = typeof req.url === 'string' ? stripQueryAndTrailingSlash(req.url) : '/';
  const method = typeof req.method === 'string' ? req.method.toUpperCase() : 'GET';
  return `${ip}:${method}:${path}`;
}

function extractIp(req: IncomingMessage): string {
  const header = req.headers['x-forwarded-for'];
  if (typeof header === 'string' && header.length > 0) {
    return header.split(',')[0]?.trim() ?? 'unknown';
  }

  if (req.socket) {
    return req.socket.remoteAddress ?? 'unknown';
  }

  return 'unknown';
}
