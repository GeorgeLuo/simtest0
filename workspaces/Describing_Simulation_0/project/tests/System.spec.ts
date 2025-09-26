// Test intents:
// - Systems initialize before running their first update tick.
// - Systems invoke teardown once and reject further updates after destruction.

import { System } from 'src/core/systems/System';

describe('System', () => {
  it('runs initialization before the first update and records execution order', () => {
    class TestSystem extends System {
      public readonly calls: string[] = [];

      protected override onInit(): void {
        this.calls.push('init');
      }

      protected override update(deltaTime: number): void {
        this.calls.push(`update:${deltaTime}`);
      }

      protected override onDestroy(): void {
        this.calls.push('destroy');
      }
    }

    const system = new TestSystem();

    system.tick(0.016);
    system.tick(0.02);
    system.destroy();

    expect(system.calls).toEqual(['init', 'update:0.016', 'update:0.02', 'destroy']);
  });

  it('prevents updates once destroyed', () => {
    class DisposableSystem extends System {
      protected override update(): void {}
    }

    const system = new DisposableSystem();

    system.tick(0);
    system.destroy();

    expect(() => system.tick(0)).toThrow('Cannot update a system that has been destroyed.');
  });
});
