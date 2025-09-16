import { describe, expect, it, vi } from 'vitest';
import { Bus } from '../../../src/ecs/messaging/Bus.js';

describe('Bus', () => {
  it('delivers published messages to every active subscriber', async () => {
    const bus = new Bus<string>();
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();

    bus.subscribe(firstSubscriber);
    bus.subscribe(secondSubscriber);

    await bus.publish('ping');

    expect(firstSubscriber).toHaveBeenCalledTimes(1);
    expect(firstSubscriber).toHaveBeenCalledWith('ping');
    expect(secondSubscriber).toHaveBeenCalledTimes(1);
    expect(secondSubscriber).toHaveBeenCalledWith('ping');
  });

  it('propagates a single subscriber error', async () => {
    const bus = new Bus<string>();
    const healthySubscriber = vi.fn();
    const failure = new Error('subscriber failed');

    bus.subscribe(healthySubscriber);
    bus.subscribe(() => {
      throw failure;
    });

    await expect(bus.publish('event')).rejects.toBe(failure);
    expect(healthySubscriber).toHaveBeenCalledWith('event');
  });

  it('aggregates multiple subscriber errors into a combined failure', async () => {
    const bus = new Bus<string>();
    const firstError = new Error('first failure');
    const secondError = new Error('second failure');
    const healthySubscriber = vi.fn();

    bus.subscribe(() => {
      throw firstError;
    });
    bus.subscribe(() => {
      throw secondError;
    });
    bus.subscribe(healthySubscriber);

    await expect(bus.publish('payload')).rejects.toThrow(
      'Multiple bus subscribers failed: first failure; second failure',
    );
    expect(healthySubscriber).toHaveBeenCalledWith('payload');
  });

  it('stops invoking callbacks once they are unsubscribed', async () => {
    const bus = new Bus<number>();
    const subscriber = vi.fn();

    const unsubscribe = bus.subscribe(subscriber);

    await bus.publish(1);
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenLastCalledWith(1);

    unsubscribe();

    await bus.publish(2);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
