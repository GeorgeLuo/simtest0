import { describe, expect, it } from 'vitest';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';

type PositionComponent = { x: number; y: number };

const positionType = {
  id: 'position',
  create(initial: PositionComponent) {
    return { ...initial };
  },
};

describe('ComponentManager', () => {
  it('requires registration before attachments and allows attachments once registered', () => {
    const manager = new ComponentManager() as any;
    const entityId = 42;
    const initialPosition: PositionComponent = { x: 5, y: -3 };

    expect(() => manager.attachComponent(entityId, positionType, initialPosition)).toThrow();

    expect(() => manager.registerType(positionType)).not.toThrow();

    const stored = manager.attachComponent(entityId, positionType, initialPosition);

    expect(stored).toEqual(initialPosition);
    expect(manager.getComponent(entityId, positionType)).toEqual(initialPosition);
  });

  it('propagates updates to the owning entity without affecting others', () => {
    const manager = new ComponentManager() as any;
    const entityA = 1;
    const entityB = 2;
    const initialA: PositionComponent = { x: 0, y: 0 };
    const initialB: PositionComponent = { x: 10, y: 10 };

    manager.registerType(positionType);
    manager.attachComponent(entityA, positionType, initialA);
    manager.attachComponent(entityB, positionType, initialB);

    const updatedA: PositionComponent = { x: 3, y: 4 };
    const result = manager.updateComponent(entityA, positionType, updatedA);

    expect(result).toEqual(updatedA);
    expect(manager.getComponent(entityA, positionType)).toEqual(updatedA);
    expect(manager.getComponent(entityB, positionType)).toEqual(initialB);
  });
});
