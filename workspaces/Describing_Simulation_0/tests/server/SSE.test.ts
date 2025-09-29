import { describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'node:stream';
import { createSSEHandler } from '../../src/server/sse';
import { Bus } from '../../src/core/messaging/Bus';

const createResponse = () => {
  const res = new PassThrough();
  const writeHead = vi.fn();
  (res as any).writeHead = writeHead;
  (res as any).write = res.write.bind(res);
  (res as any).end = res.end.bind(res);
  return { res: res as any, writeHead };
};

describe('SSE handler', () => {
  it('writes events for bus payloads', async () => {
    const bus = new Bus<{ value: number }>();
    const handler = createSSEHandler(bus, (payload) => JSON.stringify(payload));

    const { res, writeHead } = createResponse();
    handler({} as any, res);

    expect(writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'text/event-stream' }));

    bus.publish({ value: 42 });
    const chunks = res.read()?.toString('utf-8') ?? '';
    expect(chunks).toContain('data: {"value":42}');
  });
});
