import { PassThrough } from 'stream';
import { Router } from '../router';

describe('Router', () => {
  it('dispatches registered handlers with base path', () => {
    const router = new Router({ basePath: '/api' });
    const handler = jest.fn();
    router.register('/hello', handler);

    const req = { url: '/api/hello', method: 'GET' } as unknown;
    const res = {} as unknown;

    const dispatched = router.dispatch(req, res);

    expect(dispatched).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toBe(req);
    expect(handler.mock.calls[0][1]).toBe(res);
    expect(typeof handler.mock.calls[0][2]).toBe('function');
  });

  it('returns false when no handler matches', () => {
    const router = new Router({ basePath: '/api' });
    const dispatched = router.dispatch({ url: '/api/missing' } as unknown, {} as unknown);

    expect(dispatched).toBe(false);
  });

  it('parses json bodies, attaches query, and ensures json helper', async () => {
    const router = new Router({ basePath: '/api' });
    const received: Array<{ body: unknown; query: unknown }> = [];

    router.register('/echo', (req, res) => {
      received.push({ body: (req as { body?: unknown }).body, query: (req as { query?: unknown }).query });
      (res as any).json?.({ ok: true });
    });

    const req = new PassThrough({ objectMode: false });
    (req as unknown as { headers: Record<string, string> }).headers = {};
    (req as unknown as { method: string }).method = 'POST';
    (req as unknown as { url: string }).url = '/api/echo?foo=bar';

    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      statusCode: 0,
    };

    const dispatched = router.dispatch(req, res);
    expect(dispatched).toBe(true);

    req.end(JSON.stringify({ value: 42 }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ body: { value: 42 }, query: { foo: 'bar' } });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });
});
