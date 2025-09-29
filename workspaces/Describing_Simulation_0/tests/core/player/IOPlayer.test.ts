import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IOPlayer } from '../../../src/core/player/IOPlayer';
import { Bus } from '../../../src/core/messaging/Bus';
import { MessageHandler } from '../../../src/core/messaging/inbound/MessageHandler';
import { Operation } from '../../../src/core/messaging/inbound/Operation';
import { Acknowledgement } from '../../../src/core/messaging/outbound/Acknowledgement';

class RecordOperation extends Operation<void, { note: string }> {
  constructor(private readonly note: string) {
    super('record');
  }

  override execute(): Promise<{ note: string }> {
    return Promise.resolve({ note: this.note });
  }
}

describe('IOPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('dispatches inbound messages and publishes acknowledgements', async () => {
    const inbound = new Bus<{ id: string; type: string }>();
    const outbound = new Bus<Acknowledgement>();
    const player = new IOPlayer({ inboundBus: inbound, acknowledgementBus: outbound, tickIntervalMs: 10 });

    const handler = new MessageHandler('record', [new RecordOperation('ok')]);
    player.registry.register(handler);

    const acks: Acknowledgement[] = [];
    outbound.subscribe((ack) => acks.push(ack));

    inbound.publish({ id: '1', type: 'record' });
    await vi.runAllTimersAsync();

    expect(acks).toHaveLength(1);
    expect(acks[0].success).toBe(true);
    expect(acks[0].payload).toEqual({ note: 'ok' });
  });

  it('publishes error acknowledgement when handler missing', async () => {
    const inbound = new Bus<{ id: string; type: string }>();
    const outbound = new Bus<Acknowledgement>();
    const player = new IOPlayer({ inboundBus: inbound, acknowledgementBus: outbound, tickIntervalMs: 10 });

    const ackSpy = vi.fn();
    outbound.subscribe(ackSpy);

    inbound.publish({ id: 'missing', type: 'unknown' });
    await vi.runAllTimersAsync();

    expect(ackSpy).toHaveBeenCalledTimes(1);
    expect(ackSpy.mock.calls[0][0].success).toBe(false);
  });
});
