import test from 'node:test';
import assert from 'node:assert';
import { EntityManager } from '../src/ecs/entity/EntityManager.js';
import { ComponentManager } from '../src/ecs/components/ComponentManager.js';
import { ComponentType } from '../src/ecs/components/ComponentType.js';
import { System } from '../src/ecs/system/System.js';

test('System requires update implementation', () => {
  const sys = new System();
  assert.throws(() => sys.update({} as any, {} as any), /System\.update must be implemented/);
});

test('System update error references subclass name', () => {
  class NoUpdateSystem extends System {}
  const sys = new NoUpdateSystem();
  assert.throws(
    () => sys.update({} as any, {} as any),
    /NoUpdateSystem\.update must be implemented/,
  );
});

test('System init and update mutate components', () => {
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const ValueType = new ComponentType('value', { count: 'number' });

  class IncrementSystem extends System {
    entity!: number;
    init(em: EntityManager, cm: ComponentManager) {
      this.entity = em.createEntity();
      cm.addComponent(this.entity, ValueType, { count: 0 });
    }
    update(em: EntityManager, cm: ComponentManager) {
      const comp = cm.getComponent(this.entity, ValueType)!;
      comp.count++;
    }
  }

  const sys = new IncrementSystem();
  sys.init(em, cm);
  sys.update(em, cm);
  assert.strictEqual(cm.getComponent(sys.entity, ValueType)?.count, 1);
});
