const test = require('node:test');
const assert = require('assert');
const { EntityManager } = require('../ecs/entity_manager');
const { ComponentManager } = require('../ecs/component_manager');
const { ComponentType } = require('../ecs/component_type');

// EntityManager - createEntity returns unique Entity
// EntityManager - removeEntity deletes entity and its components
// EntityManager - hasEntity checks presence
// EntityManager - allEntities returns all current entities

test('EntityManager creates unique entities', () => {
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const e1 = em.createEntity();
  const e2 = em.createEntity();
  assert.notStrictEqual(e1, e2);
  assert.ok(em.hasEntity(e1));
  assert.ok(em.hasEntity(e2));
});

test('EntityManager removes entities and clears components', () => {
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const type = new ComponentType('test', {});
  const e = em.createEntity();
  cm.addComponent(e, type, {});
  em.removeEntity(e);
  assert.ok(!em.hasEntity(e));
  assert.strictEqual(cm.getComponents(e).size, 0);
  assert.strictEqual(em.allEntities().size, 0);
});

// ComponentManager - addComponent associates component data with entity and type
// ComponentManager - getComponent retrieves component for entity and type
// ComponentManager - getComponents returns all components for an entity
// ComponentManager - getEntitiesWithComponent returns entities having a component type
// ComponentManager - removeComponent removes component for entity and type
// ComponentManager - removeEntity removes all components of entity

test('ComponentManager adds and retrieves components', () => {
  const cm = new ComponentManager();
  const type = new ComponentType('position', {});
  cm.addComponent(1, type, { x: 0, y: 0 });
  const comp = cm.getComponent(1, type);
  assert.deepStrictEqual(comp, { x: 0, y: 0 });
});

test('ComponentManager queries and removes components', () => {
  const cm = new ComponentManager();
  const typeA = new ComponentType('a', {});
  const typeB = new ComponentType('b', {});
  cm.addComponent(1, typeA, { value: 1 });
  cm.addComponent(1, typeB, { value: 2 });
  cm.addComponent(2, typeA, { value: 3 });

  assert.strictEqual(cm.getComponents(1).size, 2);
  assert.deepStrictEqual(cm.getEntitiesWithComponent(typeA), new Set([1, 2]));

  cm.removeComponent(1, typeA);
  assert.strictEqual(cm.getComponent(1, typeA), undefined);

  cm.removeEntity(2);
  assert.strictEqual(cm.getComponents(2).size, 0);
});
