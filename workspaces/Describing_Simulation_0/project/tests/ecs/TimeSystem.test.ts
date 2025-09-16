import { describe, expect, it } from 'vitest';

import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { timeComponentType } from '../../src/ecs/components/implementations/TimeComponent.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { TimeSystem } from '../../src/ecs/systems/implementations/TimeSystem.js';

const createManagers = () => {
  const componentManager = new ComponentManager();
  componentManager.registerType(timeComponentType);

  const entityManager = new EntityManager(componentManager);
  return { entityManager, componentManager };
};

describe('TimeSystem', () => {
  it('creates an entity with an attached time component on construction', () => {
    const { entityManager, componentManager } = createManagers();

    const system = new TimeSystem(entityManager, componentManager);

    const entitiesWithTime = componentManager.getEntitiesWith(timeComponentType);
    expect(entitiesWithTime).toHaveLength(1);

    const entityId = entitiesWithTime[0]!;
    expect(entityManager.has(entityId)).toBe(true);

    const timeComponent = componentManager.getComponent(entityId, timeComponentType);
    expect(timeComponent).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });

    expect(system.ticks).toBe(0);
    expect(system.deltaTime).toBe(0);
    expect(system.elapsedTime).toBe(0);
  });

  it('advances ticks using the time component configuration', () => {
    const { entityManager, componentManager } = createManagers();

    const system = new TimeSystem(entityManager, componentManager);
    const entitiesWithTime = componentManager.getEntitiesWith(timeComponentType);
    expect(entitiesWithTime).toHaveLength(1);
    const entityId = entitiesWithTime[0]!;

    componentManager.updateComponent(entityId, timeComponentType, {
      deltaPerUpdate: 3,
    });

    system.update({
      deltaTime: 0.5,
      elapsedTime: 0.5,
    });

    expect(componentManager.getComponent(entityId, timeComponentType)).toStrictEqual({
      ticks: 3,
      deltaPerUpdate: 3,
    });
    expect(system.ticks).toBe(3);
    expect(system.deltaTime).toBe(0.5);
    expect(system.elapsedTime).toBe(0.5);

    system.update({
      deltaTime: 0.25,
      elapsedTime: 0.75,
    });

    expect(componentManager.getComponent(entityId, timeComponentType)).toStrictEqual({
      ticks: 6,
      deltaPerUpdate: 3,
    });
    expect(system.ticks).toBe(6);
    expect(system.deltaTime).toBe(0.25);
    expect(system.elapsedTime).toBe(0.75);
  });
});
