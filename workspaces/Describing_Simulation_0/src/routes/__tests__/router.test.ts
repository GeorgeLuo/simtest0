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

  it('registers fallback handlers without base prefix', () => {
    const router = new Router({ basePath: '/api' });
    const handler = jest.fn();
    router.register('/hello', handler);

    const req = { url: '/hello', method: 'GET' } as unknown;
    const res = {} as unknown;

    expect(router.dispatch(req, res)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches dynamic segments and populates params on requests', () => {
    const router = new Router({ basePath: '/api' });
    const handler = jest.fn();
    router.register('/items/:id', handler);

    const req = { url: '/api/items/alpha', method: 'DELETE', headers: {} } as unknown;
    const res = { setHeader: jest.fn(), end: jest.fn() } as unknown;

    expect(router.dispatch(req, res)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const calledReq = handler.mock.calls[0][0] as { params?: Record<string, string> };
    expect(calledReq.params).toEqual({ id: 'alpha' });
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

  it('rejects requests without matching auth token', () => {
    const router = new Router({ basePath: '/api', authToken: 'secret-token' });
    const handler = jest.fn();
    router.register('/protected', handler);

    const req = {
      url: '/api/protected',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Parameters<Router['dispatch']>[0];

    const res: any = {
      setHeader: jest.fn(),
      end: jest.fn(),
      headersSent: false,
      statusCode: 0,
    };

    const dispatched = router.dispatch(req, res);
    expect(dispatched).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ status: 'error', detail: 'Unauthorized' }));
  });

  it('accepts bearer tokens and enforces rate limits', () => {
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, 'now')
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now)
      .mockReturnValueOnce(now + 2000);

    const router = new Router({ basePath: '/api', authToken: 'secret-token', rateLimit: { windowMs: 1000, max: 2 } });
    const handler = jest.fn();
    router.register('/limited', handler);

    const createReq = () =>
      ({
        url: '/api/limited',
        method: 'GET',
        headers: { authorization: 'Bearer secret-token' },
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Parameters<Router['dispatch']>[0]);

    const createRes = () =>
      ({
        setHeader: jest.fn(),
        end: jest.fn(),
        headersSent: false,
        statusCode: 0,
      } as any);

    expect(router.dispatch(createReq(), createRes())).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    expect(router.dispatch(createReq(), createRes())).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);

    const throttledRes = createRes();
    expect(router.dispatch(createReq(), throttledRes)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(throttledRes.statusCode).toBe(429);
    expect(throttledRes.end).toHaveBeenCalledWith(JSON.stringify({ status: 'error', detail: 'Too Many Requests' }));

    const resetRes = createRes();
    expect(router.dispatch(createReq(), resetRes)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(3);

    nowSpy.mockRestore();
  });
});
