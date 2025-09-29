import { describe, expect, it, vi } from 'vitest';
import { Bus } from '../../../src/core/messaging/Bus';

describe('Bus', () => {
  it('notifies subscribers in order when publishing', () => {
    const bus = new Bus<string>();
    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe(first);
    bus.subscribe(second);

    bus.publish('hello');

    expect(first).toHaveBeenCalledWith('hello');
    expect(second).toHaveBeenCalledWith('hello');
    expect(first.mock.invocationCallOrder[0]).toBeLessThan(second.mock.invocationCallOrder[0]);
  });

  it('allows unsubscribing from the bus', () => {
    const bus = new Bus<number>();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(handler);

    unsubscribe();
    bus.publish(42);

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple unsubscribe calls gracefully', () => {
    const bus = new Bus<boolean>();
    const handler = vi.fn();
    const unsubscribe = bus.subscribe(handler);

    unsubscribe();
    unsubscribe();

    bus.publish(true);
    expect(handler).not.toHaveBeenCalled();
  });
});
