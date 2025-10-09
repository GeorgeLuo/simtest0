import { Server } from '../index';
import type { Router } from '../../routes/router';
import http from 'http';

jest.mock('http', () => {
  const listen = jest.fn((port: number, hostOrCallback?: string | (() => void), maybeCallback?: () => void) => {
    const callback = typeof hostOrCallback === 'function' ? hostOrCallback : maybeCallback;
    callback?.();
    return { port, hostOrCallback, maybeCallback };
  });
  const close = jest.fn((cb?: () => void) => cb && cb());
  return {
    createServer: jest.fn((handler) => ({ listen, close, handler })),
  };
});

describe('Server', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts underlying http server and wires router dispatch', async () => {
    const router = {
      dispatch: jest.fn(() => true),
    } as unknown as Router & { dispatch: jest.Mock };

    const server = new Server({ port: 4000, router });
    await expect(server.start()).resolves.toBeUndefined();

    const createServer = http.createServer as jest.Mock;
    expect(createServer).toHaveBeenCalled();

    const requestListener = createServer.mock.results[0].value.handler as (req: unknown, res: unknown) => void;
    const req = { url: '/ping' };
    const res = {};
    requestListener(req, res);

    expect(router.dispatch).toHaveBeenCalledWith(req, res);

    const listen = createServer.mock.results[0].value.listen as jest.Mock;
    expect(listen).toHaveBeenCalledWith(4000, undefined, expect.any(Function));
  });

  it('passes host to underlying http server when provided', async () => {
    const router = {
      dispatch: jest.fn(() => true),
    } as unknown as Router & { dispatch: jest.Mock };

    const server = new Server({ port: 8080, host: '127.0.0.1', router });
    await expect(server.start()).resolves.toBeUndefined();

    const createServer = http.createServer as jest.Mock;
    const listen = createServer.mock.results[0].value.listen as jest.Mock;
    expect(listen).toHaveBeenCalledWith(8080, '127.0.0.1', expect.any(Function));
  });
});
