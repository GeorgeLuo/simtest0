import { describe, expect, it } from 'vitest';

import { Entity } from '../../src/ecs/entity/Entity.js';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../src/ecs/components/ComponentType.js';

describe('Entity', () => {
  it('assigns unique identifiers to each created instance', () => {
    const entities = Array.from({ length: 50 }, () => new Entity());
    const identifiers = entities.map((entity) => entity.id);

    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('enumerates the components associated with the entity', () => {
    const componentManager = new ComponentManager();
    const entity = new Entity();
    const otherEntity = new Entity();

    type PositionComponent = { x: number; y: number };
    type VelocityComponent = { dx: number; dy: number };

    const positionType = createComponentType<PositionComponent>({
      id: 'position',
      name: 'Position',
      description: 'Tracks spatial coordinates for an entity.',
      schema: {
        x: {
          description: 'Horizontal position',
          defaultValue: 0,
        },
        y: {
          description: 'Vertical position',
          defaultValue: 0,
        },
      },
    });

    const velocityType = createComponentType<VelocityComponent>({
      id: 'velocity',
      name: 'Velocity',
      description: 'Tracks how position changes each tick.',
      schema: {
        dx: {
          description: 'Horizontal velocity',
          defaultValue: 0,
        },
        dy: {
          description: 'Vertical velocity',
          defaultValue: 0,
        },
      },
    });

    componentManager.registerType(positionType);
    componentManager.registerType(velocityType);

    const position = componentManager.attachComponent(entity.id, positionType, {
      x: 12,
      y: -7,
    });
    const velocity = componentManager.attachComponent(entity.id, velocityType);

    const otherVelocity = componentManager.attachComponent(otherEntity.id, velocityType, {
      dx: 4,
      dy: -1,
    });

    const associations = entity.enumerateComponents(componentManager);

    expect(associations).toHaveLength(2);
    expect(associations).toEqual(
      expect.arrayContaining([
        { type: positionType, instance: position },
        { type: velocityType, instance: velocity },
      ]),
    );
    expect(associations).not.toContainEqual({
      type: velocityType,
      instance: otherVelocity,
    });
  });

  it('manages components through the component manager lifecycle', () => {
    const componentManager = new ComponentManager();
    const entity = new Entity();
    const otherEntity = new Entity();

    type StatsComponent = { health: number; mana: number };

    const statsType = createComponentType<StatsComponent>({
      id: 'stats',
      name: 'Stats',
      description: 'Tracks combat-related values for an entity.',
      schema: {
        health: {
          description: 'Hit points remaining for the entity.',
          defaultValue: 100,
        },
        mana: {
          description: 'Energy used for abilities.',
          defaultValue: 50,
        },
      },
    });

    componentManager.registerType(statsType);

    const attached = entity.attachComponent(componentManager, statsType, {
      health: 80,
    });

    expect(attached).toEqual({
      health: 80,
      mana: 50,
    });
    expect(componentManager.getComponent(entity.id, statsType)).toBe(attached);
    expect(componentManager.getEntitiesWith(statsType)).toEqual([
      entity.id,
    ]);

    const retrieved = entity.getComponent(componentManager, statsType);

    expect(retrieved).toBe(attached);
    expect(componentManager.getComponent(entity.id, statsType)).toBe(attached);

    const removed = entity.removeComponent(componentManager, statsType);

    expect(removed).toBe(true);
    expect(componentManager.getComponent(entity.id, statsType)).toBeUndefined();
    expect(componentManager.getEntitiesWith(statsType)).toEqual([]);

    const reattached = entity.attachComponent(componentManager, statsType);
    const otherAttached = componentManager.attachComponent(
      otherEntity.id,
      statsType,
      {
        mana: 70,
      },
    );

    expect(reattached).toEqual({
      health: 100,
      mana: 50,
    });
    expect(componentManager.getEntitiesWith(statsType)).toEqual(
      expect.arrayContaining([entity.id, otherEntity.id]),
    );

    entity.removeAllComponents(componentManager);

    expect(componentManager.getComponent(entity.id, statsType)).toBeUndefined();
    expect(componentManager.getComponent(otherEntity.id, statsType)).toBe(
      otherAttached,
    );
    expect(componentManager.getEntitiesWith(statsType)).toEqual([otherEntity.id]);
  });
});
