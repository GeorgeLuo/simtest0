// Test intents:
// - Systems execute in ascending priority order, preserving registration order for ties.
// - Destroying all systems tears them down in reverse execution order.
// - Removing a system tears it down immediately and prevents further updates.
// - Iteration reflects the current execution order.

import { System } from 'src/core/systems/System';
import { SystemManager } from 'src/core/systems/SystemManager';

class TrackingSystem extends System {
  constructor(
    private readonly name: string,
    private readonly events: string[]
  ) {
    super();
  }

  protected override onInit(): void {
    this.events.push(`${this.name}:init`);
  }

  protected override update(deltaTime: number): void {
    this.events.push(`${this.name}:update:${deltaTime}`);
  }

  protected override onDestroy(): void {
    this.events.push(`${this.name}:destroy`);
  }
}

describe('SystemManager', () => {
  it('ticks systems by priority while keeping registration order for ties', () => {
    const events: string[] = [];
    const manager = new SystemManager();

    const slow = new TrackingSystem('slow', events);
    const fast = new TrackingSystem('fast', events);
    const steady = new TrackingSystem('steady', events);

    manager.register(slow, 5);
    manager.register(fast, 0);
    manager.register(steady, 5);

    manager.tick(0.25);

    expect(events).toEqual([
      'fast:init',
      'fast:update:0.25',
      'slow:init',
      'slow:update:0.25',
      'steady:init',
      'steady:update:0.25',
    ]);
  });

  it('destroys all systems in reverse execution order', () => {
    const events: string[] = [];
    const manager = new SystemManager();

    const first = new TrackingSystem('first', events);
    const second = new TrackingSystem('second', events);

    manager.register(first, 0);
    manager.register(second, 1);

    manager.tick(1);
    manager.destroyAll();

    expect(events).toEqual([
      'first:init',
      'first:update:1',
      'second:init',
      'second:update:1',
      'second:destroy',
      'first:destroy',
    ]);
  });

  it('removes systems eagerly and prevents further updates', () => {
    const events: string[] = [];
    const manager = new SystemManager();

    const removed = new TrackingSystem('removed', events);
    const survivor = new TrackingSystem('survivor', events);

    manager.register(removed);
    manager.register(survivor);

    manager.tick(0.5);

    const wasRemoved = manager.remove(removed);
    const removedAgain = manager.remove(removed);

    manager.tick(0.25);

    expect(wasRemoved).toBe(true);
    expect(removedAgain).toBe(false);
    expect(events).toEqual([
      'removed:init',
      'removed:update:0.5',
      'survivor:init',
      'survivor:update:0.5',
      'removed:destroy',
      'survivor:update:0.25',
    ]);
  });

  it('iterates through systems in their execution order', () => {
    const manager = new SystemManager();
    const names: string[] = [];

    const low = new TrackingSystem('low', []);
    const mid = new TrackingSystem('mid', []);
    const high = new TrackingSystem('high', []);

    manager.register(mid, 1);
    manager.register(high, 2);
    manager.register(low, 0);

    manager.forEach((system) => {
      if (system === low) {
        names.push('low');
      } else if (system === mid) {
        names.push('mid');
      } else if (system === high) {
        names.push('high');
      }
    });

    expect(names).toEqual(['low', 'mid', 'high']);
  });
});
