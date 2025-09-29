import { IncomingMessage } from 'node:http';

export async function readJsonBody<T = unknown>(req: IncomingMessage): Promise<T | undefined> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as T;
}

export function sendJson(response: import('node:http').ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  response.end(body);
}

export function notFound(response: import('node:http').ServerResponse): void {
  sendJson(response, 404, { error: 'Not Found' });
}

export function methodNotAllowed(response: import('node:http').ServerResponse): void {
  sendJson(response, 405, { error: 'Method Not Allowed' });
}

export function badRequest(response: import('node:http').ServerResponse, message: string): void {
  sendJson(response, 400, { error: message });
}

export function internalError(response: import('node:http').ServerResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  sendJson(response, 500, { error: message });
}
