// Test intents:
// - Creating entities without an explicit id yields sequential identifiers.
// - Entities can be retrieved after creation and are removed cleanly.
// - Removing an entity automatically clears its registered components.

import { EntityManager } from 'src/core/entity/EntityManager';
import { ComponentManager } from 'src/core/components/ComponentManager';
import { ComponentType } from 'src/core/components/ComponentType';

describe('EntityManager', () => {
  it('creates entities with sequential identifiers by default', () => {
    const manager = new EntityManager();
    const first = manager.create();
    const second = manager.create();

    expect(first.id).toBe('entity-1');
    expect(second.id).toBe('entity-2');
    expect(manager.list()).toHaveLength(2);
  });

  it('supports explicit identifiers and prevents duplicates', () => {
    const manager = new EntityManager();
    const custom = manager.create('player');

    expect(custom.id).toBe('player');
    expect(manager.get('player')).toBe(custom);
    expect(manager.has('player')).toBe(true);
    expect(() => manager.create('player')).toThrow('Entity with id "player" already exists.');
  });

  it('removes entities and reports status', () => {
    const manager = new EntityManager();
    const entity = manager.create();

    expect(manager.remove(entity.id)).toBe(true);
    expect(manager.get(entity.id)).toBeUndefined();
    expect(manager.remove(entity.id)).toBe(false);
  });

  it('cleans up components when removing entities', () => {
    const componentManager = new ComponentManager();
    const manager = new EntityManager(componentManager);
    const health = new ComponentType<{ hp: number }>('health');

    componentManager.register(health);

    const entity = manager.create();
    componentManager.setComponent(entity.id, health, { hp: 10 });
    expect(componentManager.hasComponent(entity.id, health)).toBe(true);

    expect(manager.remove(entity.id)).toBe(true);
    expect(componentManager.hasComponent(entity.id, health)).toBe(false);
  });
});
