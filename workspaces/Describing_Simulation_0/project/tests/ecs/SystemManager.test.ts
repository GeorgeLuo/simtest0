import { describe, expect, it, vi } from 'vitest';

import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import type { System, SystemUpdateContext } from '../../src/ecs/systems/System.js';

const createSystem = (
  id: string,
  onUpdate: (context: SystemUpdateContext) => void,
): System => ({
  id,
  update: onUpdate,
});

const createLifecycleSystem = (
  id: string,
  initializeOrder: string[],
  shutdownOrder: string[],
): System => ({
  id,
  update: vi.fn(),
  initialize: vi.fn(() => {
    initializeOrder.push(id);
  }),
  shutdown: vi.fn(() => {
    shutdownOrder.push(id);
  }),
});

describe('SystemManager', () => {
  it('registers systems and prevents duplicate identifiers', () => {
    const manager = new SystemManager();

    const alpha = createSystem('alpha', () => {});
    manager.register(alpha);

    expect(manager.has('alpha')).toBe(true);
    expect(manager.get('alpha')).toBe(alpha);
    expect(manager.getAll()).toEqual([alpha]);
    expect(manager.getElapsedTime()).toBe(0);

    const duplicate = createSystem('alpha', () => {});

    expect(() => manager.register(duplicate)).toThrowError(
      'System with id "alpha" is already registered',
    );
  });

  it('executes systems sequentially while tracking elapsed time', async () => {
    const manager = new SystemManager();
    const executionOrder: string[] = [];
    const contexts = new Map<string, SystemUpdateContext[]>();

    const trackSystem = (id: string): System =>
      createSystem(id, (context) => {
        executionOrder.push(id);
        const history = contexts.get(id) ?? [];
        history.push({ ...context });
        contexts.set(id, history);
      });

    manager.register(trackSystem('first'));
    manager.register(trackSystem('second'));
    manager.register(trackSystem('third'));

    await manager.update(0.25);
    await manager.update(0.5);

    expect(executionOrder).toEqual([
      'first',
      'second',
      'third',
      'first',
      'second',
      'third',
    ]);

    expect(manager.getElapsedTime()).toBeCloseTo(0.75);

    const firstContexts = contexts.get('first') ?? [];
    const secondContexts = contexts.get('second') ?? [];
    const thirdContexts = contexts.get('third') ?? [];

    for (const history of [firstContexts, secondContexts, thirdContexts]) {
      expect(history.map((entry) => entry.deltaTime)).toEqual([0.25, 0.5]);
      expect(history.map((entry) => entry.elapsedTime)).toEqual([0.25, 0.75]);
    }
  });

  it('throws when updated with a negative delta time', async () => {
    const manager = new SystemManager();

    await expect(manager.update(-0.1)).rejects.toThrowError(
      'deltaTime must be a non-negative number',
    );
  });

  it('initializes systems in their registration order', async () => {
    const manager = new SystemManager();
    const initializeOrder: string[] = [];
    const shutdownOrder: string[] = [];

    manager.register(createLifecycleSystem('alpha', initializeOrder, shutdownOrder));
    manager.register(createLifecycleSystem('beta', initializeOrder, shutdownOrder));
    manager.register(createLifecycleSystem('gamma', initializeOrder, shutdownOrder));

    await manager.initializeAll();

    expect(initializeOrder).toEqual(['alpha', 'beta', 'gamma']);
    expect(shutdownOrder).toEqual([]);
  });

  it('shuts down systems in reverse registration order', async () => {
    const manager = new SystemManager();
    const initializeOrder: string[] = [];
    const shutdownOrder: string[] = [];

    manager.register(createLifecycleSystem('alpha', initializeOrder, shutdownOrder));
    manager.register(createLifecycleSystem('beta', initializeOrder, shutdownOrder));
    manager.register(createLifecycleSystem('gamma', initializeOrder, shutdownOrder));

    await manager.initializeAll();
    expect(initializeOrder).toEqual(['alpha', 'beta', 'gamma']);
    expect(shutdownOrder).toEqual([]);

    await manager.shutdownAll();

    expect(shutdownOrder).toEqual(['gamma', 'beta', 'alpha']);
    expect(initializeOrder).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('unregisters systems and reports whether a removal occurred', () => {
    const manager = new SystemManager();
    const alpha = createSystem('alpha', vi.fn());
    const beta = createSystem('beta', vi.fn());

    manager.register(alpha);
    manager.register(beta);

    expect(manager.unregister('alpha')).toBe(true);
    expect(manager.has('alpha')).toBe(false);
    expect(manager.get('alpha')).toBeUndefined();
    expect(manager.getAll()).toEqual([beta]);

    expect(manager.unregister('alpha')).toBe(false);
    expect(manager.unregister('missing')).toBe(false);
  });

  it('does not execute unregistered systems during updates', async () => {
    const manager = new SystemManager();
    const activeUpdate = vi.fn();
    const removedUpdate = vi.fn();

    manager.register(createSystem('active', activeUpdate));
    manager.register(createSystem('removed', removedUpdate));

    await manager.update(1);
    expect(activeUpdate).toHaveBeenCalledTimes(1);
    expect(removedUpdate).toHaveBeenCalledTimes(1);

    expect(manager.unregister('removed')).toBe(true);

    await manager.update(0.5);
    expect(activeUpdate).toHaveBeenCalledTimes(2);
    expect(removedUpdate).toHaveBeenCalledTimes(1);
  });
});
