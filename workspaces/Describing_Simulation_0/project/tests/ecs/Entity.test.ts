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
});
