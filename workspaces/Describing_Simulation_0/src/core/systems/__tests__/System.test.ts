import { System, type SystemContext } from '../System';

describe('System base class', () => {
  it('invokes lifecycle hooks in the expected order', () => {
    const calls: string[] = [];
    class TestSystem extends System {
      initialize(context: SystemContext): void {
        calls.push(`initialize:${context.entityManager}`);
      }

      update(context: SystemContext): void {
        calls.push(`update:${context.componentManager}`);
      }

      destroy(context: SystemContext): void {
        calls.push(`destroy:${context.entityManager}`);
      }
    }

    const context: SystemContext = {
      entityManager: {} as never,
      componentManager: {} as never,
    };

    const system = new TestSystem();
    system.initialize(context);
    system.update(context);
    system.destroy(context);

    expect(calls).toEqual([
      `initialize:${context.entityManager}`,
      `update:${context.componentManager}`,
      `destroy:${context.entityManager}`,
    ]);
  });

  it('provides default no-op hooks for initialize and destroy', () => {
    class NoOpSystem extends System {
      update(): void {
        // no-op update
      }
    }

    const context: SystemContext = {
      entityManager: {} as never,
      componentManager: {} as never,
    };

    const system = new NoOpSystem();
    expect(() => system.initialize(context)).not.toThrow();
    expect(() => system.destroy(context)).not.toThrow();
  });
});
