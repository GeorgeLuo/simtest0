import { describe, expect, it } from 'vitest';
import { IOPlayer } from '../../../../src/core/player/IOPlayer';
import { Bus } from '../../../../src/core/messaging/Bus';
import { Acknowledgement } from '../../../../src/core/messaging/outbound/Acknowledgement';
import { createPlaybackHandlers } from '../../../../src/core/player/operations';

describe('Playback operations', () => {
  const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

  it('registers start, pause, and stop handlers that control the player', async () => {
    const inbound = new Bus<{ id: string; type: string }>();
    const outbound = new Bus<Acknowledgement>();
    const player = new IOPlayer({ inboundBus: inbound, acknowledgementBus: outbound, tickIntervalMs: 1_000_000 });

    createPlaybackHandlers(player);

    const states: string[] = [];
    outbound.subscribe((ack) => {
      if (ack.payload && typeof ack.payload.state === 'string') {
        states.push(ack.payload.state);
      }
    });

    inbound.publish({ id: '1', type: 'start' });
    await flushAsync();

    inbound.publish({ id: '2', type: 'pause' });
    await flushAsync();

    inbound.publish({ id: '3', type: 'stop' });
    await flushAsync();

    expect(states).toEqual(['running', 'paused', 'idle']);
  });

  it('responds with error acknowledgement when invoking unknown operation', async () => {
    const inbound = new Bus<{ id: string; type: string }>();
    const outbound = new Bus<Acknowledgement>();
    const player = new IOPlayer({ inboundBus: inbound, acknowledgementBus: outbound, tickIntervalMs: 1_000_000 });

    createPlaybackHandlers(player);

    const acknowledgements: Acknowledgement[] = [];
    outbound.subscribe((ack) => acknowledgements.push(ack));

    inbound.publish({ id: 'missing', type: 'unknown' });
    await flushAsync();

    expect(acknowledgements).toHaveLength(1);
    expect(acknowledgements[0].success).toBe(false);
  });
});
