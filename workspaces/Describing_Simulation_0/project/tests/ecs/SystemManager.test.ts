import { describe, expect, it } from 'vitest';

import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import type { System, SystemUpdateContext } from '../../src/ecs/systems/System.js';

const createSystem = (
  id: string,
  onUpdate: (context: SystemUpdateContext) => void,
): System => ({
  id,
  update: onUpdate,
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
});
