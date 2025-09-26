// Test intents:
// - Register component types once and guard against duplicates.
// - Attach, query, update, and remove components for entities.
// - Query every component stored by an entity and all entities storing a component.
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

  it('lists all components stored for an entity by their type', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const health = new ComponentType<{ hp: number }>('health');
    const position = new ComponentType<{ x: number; y: number }>('position');

    componentManager.register(health);
    componentManager.register(position);

    const player = entityManager.create('player');
    const npc = entityManager.create('npc');

    componentManager.setComponent(player.id, health, { hp: 12 });
    componentManager.setComponent(player.id, position, { x: 5, y: 6 });
    componentManager.setComponent(npc.id, health, { hp: 3 });

    const playerComponents = componentManager.getComponentsForEntity(player.id);
    expect(playerComponents.size).toBe(2);
    expect(playerComponents.get(health)).toEqual({ hp: 12 });
    expect(playerComponents.get(position)).toEqual({ x: 5, y: 6 });

    const npcComponents = componentManager.getComponentsForEntity(npc.id);
    expect(npcComponents.size).toBe(1);
    expect(npcComponents.get(health)).toEqual({ hp: 3 });
    expect(npcComponents.has(position)).toBe(false);
  });

  it('lists entity ids storing a specific component type', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const health = new ComponentType<{ hp: number }>('health');
    const position = new ComponentType<{ x: number; y: number }>('position');

    componentManager.register(health);
    componentManager.register(position);

    const player = entityManager.create('player');
    const npc = entityManager.create('npc');

    componentManager.setComponent(player.id, health, { hp: 8 });
    componentManager.setComponent(npc.id, health, { hp: 4 });
    componentManager.setComponent(player.id, position, { x: 1, y: 2 });

    expect(componentManager.entitiesWithComponent(health)).toEqual([player.id, npc.id]);
    expect(componentManager.entitiesWithComponent(position)).toEqual([player.id]);

    componentManager.removeComponent(player.id, health);
    expect(componentManager.entitiesWithComponent(health)).toEqual([npc.id]);
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
