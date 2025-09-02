import test from 'node:test';
import assert from 'node:assert';
import { OutboundMessageBus, OutboundMessage } from '../src/ecs/messaging/OutboundMessageBus.js';
import { OutboundMessageType } from '../src/ecs/messaging/OutboundMessageType.js';
import { OutboundMessageComponent } from '../src/ecs/components/implementations/OutboundMessageComponent.js';
import { OutboundMessageSystem } from '../src/ecs/systems/implementations/OutboundMessageSystem.js';
import { ComponentManager } from '../src/ecs/components/ComponentManager.js';
import { EntityManager } from '../src/ecs/entity/EntityManager.js';

test('OutboundMessageBus delivers messages to listener', () => {
  const bus = new OutboundMessageBus();
  const received: OutboundMessage[] = [];
  bus.subscribe((msg) => received.push(msg));
  bus.push({ type: OutboundMessageType.Data, payload: { value: 1 } });
  assert.deepStrictEqual(received, [
    { type: OutboundMessageType.Data, payload: { value: 1 } },
  ]);
});

test('OutboundMessageBus allows only one listener', () => {
  const bus = new OutboundMessageBus();
  bus.subscribe(() => {});
  assert.throws(() => bus.subscribe(() => {}));
});

test('OutboundMessageSystem emits messages and clears entities', () => {
  const bus = new OutboundMessageBus();
  const cm = new ComponentManager();
  const em = new EntityManager(cm);
  const received: OutboundMessage[] = [];
  bus.subscribe((msg) => received.push(msg));
  const e = em.createEntity();
  cm.addComponent(e, OutboundMessageComponent, {
    type: OutboundMessageType.Data,
    payload: { foo: 'bar' },
  });
  const sys = new OutboundMessageSystem(bus);
  sys.update(em, cm);
  assert.deepStrictEqual(received, [
    { type: OutboundMessageType.Data, payload: { foo: 'bar' } },
  ]);
  assert.strictEqual(em.hasEntity(e), false);
  assert.strictEqual(
    cm.getComponent(e, OutboundMessageComponent),
    undefined,
  );
});
