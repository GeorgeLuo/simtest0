import { beforeEach, describe, expect, it } from 'vitest';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { TimeComponentType, TimeSystem } from '../../../src/core/time';

describe('TimeSystem', () => {
  let entityManager: EntityManager;
  let componentManager: ComponentManager;
  let timeComponent: TimeComponentType;
  let system: TimeSystem;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentManager = new ComponentManager(entityManager);
    timeComponent = new TimeComponentType();
    system = new TimeSystem(timeComponent);
  });

  it('creates a time entity with initial tick 0 on init', () => {
    system.onInit(entityManager, componentManager);

    const entities = componentManager.getEntitiesWith(timeComponent);
    expect(entities).toHaveLength(1);

    const entity = entities[0];
    const component = componentManager.getComponent(entity, timeComponent);
    expect(component?.data.tick).toBe(0);
  });

  it('increments time component on each update', () => {
    system.onInit(entityManager, componentManager);
    const entity = componentManager.getEntitiesWith(timeComponent)[0];

    system.update(entityManager, componentManager);
    system.update(entityManager, componentManager);

    const component = componentManager.getComponent(entity, timeComponent);
    expect(component?.data.tick).toBe(2);
  });

  it('removes the time entity on destroy', () => {
    system.onInit(entityManager, componentManager);
    const entity = componentManager.getEntitiesWith(timeComponent)[0];

    system.onDestroy(entityManager, componentManager);

    expect(entityManager.hasEntity(entity)).toBe(false);
    expect(componentManager.getEntitiesWith(timeComponent)).toHaveLength(0);
  });

  it('recreates the time entity if removed before update', () => {
    system.onInit(entityManager, componentManager);
    const entity = componentManager.getEntitiesWith(timeComponent)[0];

    entityManager.removeEntity(entity);

    system.update(entityManager, componentManager);

    const entities = componentManager.getEntitiesWith(timeComponent);
    expect(entities).toHaveLength(1);
    const newEntity = entities[0];
    const component = componentManager.getComponent(newEntity, timeComponent);
    expect(component?.data.tick).toBe(0);
  });

  it('restores missing time component with zero tick if removed externally', () => {
    system.onInit(entityManager, componentManager);
    const entity = componentManager.getEntitiesWith(timeComponent)[0];
    componentManager.removeComponent(entity, timeComponent);

    system.update(entityManager, componentManager);

    const component = componentManager.getComponent(entity, timeComponent);
    expect(component?.data.tick).toBe(0);
  });
});
