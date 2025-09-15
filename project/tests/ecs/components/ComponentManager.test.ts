import { describe, expect, it } from '../../testHarness';

import { ComponentManager } from '../../../src/ecs/components/ComponentManager';
import { ComponentType } from '../../../src/ecs/components/ComponentType';
import { EntityManager } from '../../../src/ecs/entity/EntityManager';

describe('ComponentManager', () => {
  it('stores components retrievable by entity and type', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager(entityManager);
    const entity = entityManager.createEntity();
    const position = new ComponentType<{ x: number; y: number }>('position');

    componentManager.attachComponent(entity, position, { x: 1, y: 2 });

    expect(componentManager.getComponent(entity.id, position)).toEqual({ x: 1, y: 2 });
  });

  it('validates component data before attaching', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager(entityManager);
    const entity = entityManager.createEntity();
    const scalar = new ComponentType<number>('scalar', (value): value is number => typeof value === 'number');

    expect(() => componentManager.attachComponent(entity, scalar, 5)).not.toThrow();
    expect(() => componentManager.attachComponent(entity, scalar, 'bad' as unknown as number)).toThrowError();
  });

  it('removes components and reports when they existed', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager(entityManager);
    const entity = entityManager.createEntity();
    const tag = new ComponentType<string>('tag', (value): value is string => typeof value === 'string');

    componentManager.attachComponent(entity, tag, 'hello');

    expect(componentManager.detachComponent(entity, tag)).toBe(true);
    expect(componentManager.getComponent(entity, tag)).toBeUndefined();
    expect(componentManager.detachComponent(entity, tag)).toBe(false);
  });

  it('lists entities possessing a component type', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager(entityManager);
    const position = new ComponentType<number>('position', (value): value is number => typeof value === 'number');
    const first = entityManager.createEntity();
    const second = entityManager.createEntity();
    const third = entityManager.createEntity();

    componentManager.attachComponent(first, position, 1);
    componentManager.attachComponent(third, position, 3);

    expect(componentManager.getEntitiesWithComponent(position)).toEqual([first.id, third.id]);
  });

  it("clears all of an entity's components", () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager(entityManager);
    const entity = entityManager.createEntity();
    const position = new ComponentType<number>('position', (value): value is number => typeof value === 'number');
    const velocity = new ComponentType<number>('velocity', (value): value is number => typeof value === 'number');

    componentManager.attachComponent(entity, position, 10);
    componentManager.attachComponent(entity, velocity, 5);

    componentManager.removeAllComponents(entity);

    expect(componentManager.getComponent(entity, position)).toBeUndefined();
    expect(componentManager.getComponent(entity, velocity)).toBeUndefined();
    expect(componentManager.getEntitiesWithComponent(position)).toEqual([]);
  });
});
