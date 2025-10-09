import { EntityManager } from '../EntityManager';

const createManagerWithEntities = (count: number): { manager: EntityManager; ids: number[] } => {
  const manager = new EntityManager();
  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) {
    ids.push(manager.create());
  }
  return { manager, ids };
};

describe('EntityManager', () => {
  it('allocates unique entity ids on each create call', () => {
    const { manager, ids } = createManagerWithEntities(5);
    expect(new Set(ids).size).toBe(ids.length);
    expect(manager.list()).toEqual(ids);
  });

  it('reflects lifecycle transitions via has()', () => {
    const manager = new EntityManager();
    const entity = manager.create();
    expect(manager.has(entity)).toBe(true);
    manager.remove(entity);
    expect(manager.has(entity)).toBe(false);
    const recreated = manager.create();
    expect(manager.has(recreated)).toBe(true);
  });

  it('removes entities and reports success state', () => {
    const manager = new EntityManager();
    const entity = manager.create();
    expect(manager.remove(entity)).toBe(true);
    expect(manager.remove(entity)).toBe(false);
  });

  it('list() enumerates active entities without duplicates', () => {
    const manager = new EntityManager();
    const entityA = manager.create();
    const entityB = manager.create();
    manager.remove(entityA);
    const entityC = manager.create();
    expect(manager.list()).toEqual([entityB, entityC]);
  });

  it('removing an entity eliminates it from list() and has()', () => {
    const manager = new EntityManager();
    const entity = manager.create();
    expect(manager.list()).toContain(entity);
    manager.remove(entity);
    expect(manager.list()).not.toContain(entity);
    expect(manager.has(entity)).toBe(false);
  });
});
