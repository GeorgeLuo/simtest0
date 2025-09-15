import { describe, expect, it } from '../../testHarness';

import { EntityManager } from '../../../src/ecs/entity/EntityManager';

describe('EntityManager', () => {
  it('creates entities with unique identifiers', () => {
    const manager = new EntityManager();
    const first = manager.createEntity();
    const second = manager.createEntity();

    expect(first.id).not.toBe(second.id);
    expect(manager.hasEntity(first)).toBe(true);
    expect(manager.hasEntity(second.id)).toBe(true);
  });

  it('removes existing entities and reports removal status', () => {
    const manager = new EntityManager();
    const entity = manager.createEntity();

    expect(manager.destroyEntity(entity.id)).toBe(true);
    expect(manager.hasEntity(entity)).toBe(false);
    expect(manager.destroyEntity(entity.id)).toBe(false);
  });

  it('retrieves entities by identifier while they exist', () => {
    const manager = new EntityManager();
    const entity = manager.createEntity();

    expect(manager.getEntity(entity.id)).toEqual(entity);

    manager.destroyEntity(entity);

    expect(manager.getEntity(entity.id)).toBeUndefined();
  });

  it('lists only currently active entities', () => {
    const manager = new EntityManager();
    const first = manager.createEntity();
    const second = manager.createEntity();
    const third = manager.createEntity();

    manager.destroyEntity(second);

    expect(manager.getAllEntities()).toEqual([first, third]);
  });
});
