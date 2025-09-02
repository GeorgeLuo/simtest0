const test = require('node:test');
const assert = require('assert');
const { EntityManager } = require('../src/ecs/entity/EntityManager.js');
const { ComponentManager } = require('../src/ecs/components/ComponentManager.js');
const { ComponentType } = require('../src/ecs/components/ComponentType.js');
const { System } = require('../src/ecs/system/System.js');

test('System requires update implementation', () => {
  const sys = new System();
  assert.throws(() => sys.update(), /System\.update must be implemented/);
});

test('System update error references subclass name', () => {
  class NoUpdateSystem extends System {}
  const sys = new NoUpdateSystem();
  assert.throws(
    () => sys.update(),
    /NoUpdateSystem\.update must be implemented/
  );
});

test('System init and update mutate components', () => {
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const ValueType = new ComponentType('value', { count: 'number' });

  class IncrementSystem extends System {
    init(em, cm) {
      this.entity = em.createEntity();
      cm.addComponent(this.entity, ValueType, { count: 0 });
    }
    update(em, cm) {
      const comp = cm.getComponent(this.entity, ValueType);
      comp.count++;
    }
  }

  const sys = new IncrementSystem();
  sys.init(em, cm);
  sys.update(em, cm);
  assert.strictEqual(cm.getComponent(sys.entity, ValueType).count, 1);
});
