import { describe, expect, it } from 'vitest';

import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { timeComponentType } from '../../src/ecs/components/implementations/TimeComponent.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import { TimeSystem } from '../../src/ecs/systems/implementations/TimeSystem.js';

describe('TimeSystem', () => {
  it('advances an attached time component according to its delta per update', async () => {
    const componentManager = new ComponentManager();
    componentManager.registerType(timeComponentType);

    const entityManager = new EntityManager(componentManager);
    const entity = entityManager.create();

    componentManager.attachComponent(entity.id, timeComponentType, {
      ticks: 5,
      deltaPerUpdate: 2,
    });

    const timeSystem = new TimeSystem(componentManager, entity.id);
    const systemManager = new SystemManager();
    systemManager.register(timeSystem);

    await systemManager.update(0.25);

    const componentAfterFirstUpdate = componentManager.getComponent(
      entity.id,
      timeComponentType,
    );

    expect(componentAfterFirstUpdate).not.toBeUndefined();
    expect(componentAfterFirstUpdate!.ticks).toBe(7);
    expect(componentAfterFirstUpdate!.deltaPerUpdate).toBe(2);
    expect(timeSystem.ticks).toBe(7);
    expect(timeSystem.deltaTime).toBeCloseTo(0.25);
    expect(timeSystem.elapsedTime).toBeCloseTo(0.25);

    await systemManager.update(0.75);

    const componentAfterSecondUpdate = componentManager.getComponent(
      entity.id,
      timeComponentType,
    );

    expect(componentAfterSecondUpdate).not.toBeUndefined();
    expect(componentAfterSecondUpdate!.ticks).toBe(9);
    expect(componentAfterSecondUpdate!.deltaPerUpdate).toBe(2);
    expect(timeSystem.ticks).toBe(9);
    expect(timeSystem.deltaTime).toBeCloseTo(0.75);
    expect(timeSystem.elapsedTime).toBeCloseTo(1);
  });

  it('creates a time component when one is not already attached', async () => {
    const componentManager = new ComponentManager();
    componentManager.registerType(timeComponentType);

    const entityManager = new EntityManager(componentManager);
    const entity = entityManager.create();

    const timeSystem = new TimeSystem(componentManager, entity.id);
    const systemManager = new SystemManager();
    systemManager.register(timeSystem);

    await systemManager.update(0.1);

    const component = componentManager.getComponent(entity.id, timeComponentType);

    expect(component).not.toBeUndefined();
    expect(component!.ticks).toBe(1);
    expect(component!.deltaPerUpdate).toBe(1);
    expect(timeSystem.ticks).toBe(1);
    expect(timeSystem.deltaTime).toBeCloseTo(0.1);
    expect(timeSystem.elapsedTime).toBeCloseTo(0.1);
  });
});
