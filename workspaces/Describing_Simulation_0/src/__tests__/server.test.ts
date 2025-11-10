jest.mock('http', () => ({
  createServer: jest.fn(),
}));

import { Server } from '../server';
import type { Router } from '../routes/router';

const http = require('http') as { createServer: jest.Mock };

describe('Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches requests through router and returns 404 when unhandled', async () => {
    const listenMock = jest.fn((port: number, host: string | undefined, cb: () => void) => {
      expect(port).toBe(3000);
      expect(host).toBe('127.0.0.1');
      cb();
    });
    const closeMock = jest.fn((cb?: (error?: Error | null) => void) => {
      cb?.();
    });

    let capturedHandler: (req: unknown, res: any) => void = () => undefined;
    http.createServer.mockImplementation((handler: (req: unknown, res: any) => void) => {
      capturedHandler = handler;
      return {
        listen: listenMock,
        close: closeMock,
      };
    });

    const router = {
      dispatch: jest.fn().mockReturnValue(false),
    } as unknown as Router & { dispatch: jest.Mock };

    const server = new Server({ port: 3000, host: '127.0.0.1', router });
    await server.start();

    expect(http.createServer).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledTimes(1);

    const res = {
      writeHead: jest.fn(),
      end: jest.fn(),
      headersSent: false,
    };
    capturedHandler({ url: '/unknown' }, res);

    expect(router.dispatch).toHaveBeenCalledWith({ url: '/unknown' }, res);
    expect(res.writeHead).toHaveBeenCalledWith(404);
    expect(res.end).toHaveBeenCalled();

    await server.stop();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('delegates root requests to router', async () => {
    const listenMock = jest.fn((port: number, host: string | undefined, cb: () => void) => {
      cb();
    });
    const closeMock = jest.fn((cb?: (error?: Error | null) => void) => {
      cb?.();
    });

    let capturedHandler: (req: unknown, res: any) => void = () => undefined;
    http.createServer.mockImplementation((handler: (req: unknown, res: any) => void) => {
      capturedHandler = handler;
      return {
        listen: listenMock,
        close: closeMock,
      };
    });

    const router = {
      dispatch: jest.fn().mockReturnValue(true),
    } as unknown as Router & { dispatch: jest.Mock };

    const server = new Server({ port: 3000, host: '127.0.0.1', router });
    await server.start();

    const res = {
      writeHead: jest.fn(),
      end: jest.fn(),
      headersSent: false,
    };

    capturedHandler({ url: '/', method: 'GET' }, res);

    expect(router.dispatch).toHaveBeenCalledWith({ url: '/', method: 'GET' }, res);
    expect(res.writeHead).not.toHaveBeenCalledWith(404);

    await server.stop();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
