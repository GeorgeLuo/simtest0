import { describe, expect, it, vi } from 'vitest';

import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../src/ecs/components/ComponentType.js';

type HealthComponent = {
  value: number;
};

const healthType = createComponentType<HealthComponent>({
  id: 'health',
  name: 'Health',
  description: 'Tracks the vitality of an entity.',
  schema: {
    value: {
      description: 'Current hit points for the entity.',
      defaultValue: 100,
    },
  },
});

describe('EntityManager', () => {
  it('creates entities sequentially and tears them down in destruction order', () => {
    const componentManager = new ComponentManager();
    const entityManager = new EntityManager(componentManager);

    componentManager.registerType(healthType);

    const first = entityManager.create();
    const second = entityManager.create();
    const third = entityManager.create();

    componentManager.attachComponent(first.id, healthType, { value: 80 });
    componentManager.attachComponent(second.id, healthType);

    expect(entityManager.getAll().map((entity) => entity.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ]);

    const cleanupSpy = vi.spyOn(componentManager, 'removeAllComponents');

    try {
      expect(entityManager.destroy(first)).toBe(true);
      expect(cleanupSpy).toHaveBeenCalledWith(first.id);
      expect(entityManager.getAll().map((entity) => entity.id)).toEqual([
        second.id,
        third.id,
      ]);

      expect(entityManager.destroy(second.id)).toBe(true);
      expect(cleanupSpy).toHaveBeenCalledWith(second.id);
      expect(entityManager.getAll().map((entity) => entity.id)).toEqual([third.id]);

      expect(entityManager.destroy(third.id)).toBe(true);
      expect(cleanupSpy).toHaveBeenCalledWith(third.id);
      expect(entityManager.getAll()).toEqual([]);

      cleanupSpy.mockClear();

      expect(entityManager.destroy(third.id)).toBe(false);
      expect(cleanupSpy).not.toHaveBeenCalled();
    } finally {
      cleanupSpy.mockRestore();
    }
  });

  it('provides lookup helpers for entity handles', () => {
    const manager = new EntityManager();

    const created = manager.create();

    expect(manager.getAll().map((entity) => entity.id)).toEqual([created.id]);
    expect(manager.has(created.id)).toBe(true);
    expect(manager.get(created.id)).toBe(created);
    expect(manager.require(created.id)).toBe(created);

    const missingId = created.id + 999;

    expect(manager.has(missingId)).toBe(false);
    expect(manager.get(missingId)).toBeUndefined();
    expect(() => manager.require(missingId)).toThrowError(
      `Entity ${missingId} is not managed by this EntityManager`,
    );

    manager.destroy(created.id);

    expect(manager.has(created.id)).toBe(false);
    expect(manager.getAll()).toEqual([]);
  });
});
