// Test intents:
// - Register component types once and guard against duplicates.
// - Attach, query, update, and remove components for entities.
// - Clearing an entity removes all of its registered components.

import { ComponentManager } from 'src/core/components/ComponentManager';
import { ComponentType } from 'src/core/components/ComponentType';
import { EntityManager } from 'src/core/entity/EntityManager';

describe('ComponentManager', () => {
  it('registers component types once', () => {
    const manager = new ComponentManager();
    const health = new ComponentType<{ hp: number }>('health');

    expect(manager.isRegistered(health)).toBe(false);
    manager.register(health);
    expect(manager.isRegistered('health')).toBe(true);
    expect(() => manager.register(health)).toThrow('Component type "health" is already registered.');
  });

  it('manages component instances per entity', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const health = new ComponentType<{ hp: number }>('health');

    componentManager.register(health);
    const entity = entityManager.create();

    componentManager.setComponent(entity.id, health, { hp: 10 });
    expect(componentManager.hasComponent(entity.id, health)).toBe(true);
    expect(componentManager.getComponent(entity.id, health)).toEqual({ hp: 10 });

    componentManager.setComponent(entity.id, health, { hp: 7 });
    expect(componentManager.getComponent(entity.id, health)).toEqual({ hp: 7 });

    expect(componentManager.removeComponent(entity.id, health)).toBe(true);
    expect(componentManager.hasComponent(entity.id, health)).toBe(false);
    expect(componentManager.removeComponent(entity.id, health)).toBe(false);
  });

  it('clears all components for a removed entity', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const health = new ComponentType<{ hp: number }>('health');
    const position = new ComponentType<{ x: number; y: number }>('position');

    componentManager.register(health);
    componentManager.register(position);

    const entity = entityManager.create('player');

    componentManager.setComponent(entity.id, health, { hp: 5 });
    componentManager.setComponent(entity.id, position, { x: 3, y: 4 });

    expect(componentManager.removeAllComponents(entity.id)).toBe(true);
    expect(componentManager.hasComponent(entity.id, health)).toBe(false);
    expect(componentManager.hasComponent(entity.id, position)).toBe(false);
    expect(componentManager.removeAllComponents(entity.id)).toBe(false);
  });
});
