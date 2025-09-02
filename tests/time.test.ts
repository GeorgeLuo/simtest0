import test from 'node:test';
import assert from 'node:assert';
import { EntityManager } from '../src/ecs/entity/EntityManager.js';
import { ComponentManager } from '../src/ecs/components/ComponentManager.js';
import { TimeComponent } from '../src/ecs/components/implementations/TimeComponent.js';
import { TimeSystem } from '../src/ecs/systems/implementations/TimeSystem.js';

// TimeSystem creates a time entity with an initial time of 0 on init
// TimeSystem increments the time component on each update

test('TimeSystem initializes time to 0 and increments each update', () => {
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const timeSystem = new TimeSystem();
  timeSystem.init(em, cm);
  const entities = cm.getEntitiesWithComponent(TimeComponent);
  assert.strictEqual(entities.size, 1);
  const e = Array.from(entities)[0];
  const comp = cm.getComponent(e, TimeComponent)!;
  assert.strictEqual(comp.value, 0);
  timeSystem.update(em, cm);
  assert.strictEqual(cm.getComponent(e, TimeComponent)?.value, 1);
  timeSystem.update(em, cm);
  assert.strictEqual(cm.getComponent(e, TimeComponent)?.value, 2);
});
