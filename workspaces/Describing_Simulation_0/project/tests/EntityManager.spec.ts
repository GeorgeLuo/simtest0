// Test intents:
// - Creating entities without an explicit id yields sequential identifiers.
// - Entities can be retrieved after creation and are removed cleanly.

import { EntityManager } from 'src/core/entity/EntityManager';

describe('EntityManager', () => {
  it('creates entities with sequential identifiers by default', () => {
    const manager = new EntityManager();
    const first = manager.create();
    const second = manager.create();

    expect(first.id).toBe('entity-1');
    expect(second.id).toBe('entity-2');
    expect(manager.list()).toHaveLength(2);
  });

  it('supports explicit identifiers and prevents duplicates', () => {
    const manager = new EntityManager();
    const custom = manager.create('player');

    expect(custom.id).toBe('player');
    expect(manager.get('player')).toBe(custom);
    expect(manager.has('player')).toBe(true);
    expect(() => manager.create('player')).toThrow('Entity with id "player" already exists.');
  });

  it('removes entities and reports status', () => {
    const manager = new EntityManager();
    const entity = manager.create();

    expect(manager.remove(entity.id)).toBe(true);
    expect(manager.get(entity.id)).toBeUndefined();
    expect(manager.remove(entity.id)).toBe(false);
  });
});
