import { describe, expect, it } from 'vitest';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../src/ecs/components/ComponentType.js';

type PositionComponent = { x: number; y: number };

const positionType = createComponentType<PositionComponent>({
  id: 'position',
  name: 'Position',
  description: 'Tracks entity coordinates in 2D space.',
  schema: {
    x: {
      description: 'Horizontal axis position.',
      defaultValue: 0,
    },
    y: {
      description: 'Vertical axis position.',
      defaultValue: 0,
    },
  },
});

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

    const updatedA: Partial<PositionComponent> = { x: 3 };
    const result = manager.updateComponent(entityA, positionType, updatedA);

    expect(result).toEqual({ x: 3, y: 0 });
    expect(manager.getComponent(entityA, positionType)).toEqual({ x: 3, y: 0 });
    expect(manager.getComponent(entityB, positionType)).toEqual(initialB);
  });

  it('can attach components using type defaults when no overrides are provided', () => {
    const manager = new ComponentManager() as any;
    const entityId = 99;

    manager.registerType(positionType);

    const component = manager.attachComponent(entityId, positionType);

    expect(component).toEqual({ x: 0, y: 0 });
    expect(manager.getComponent(entityId, positionType)).toEqual({ x: 0, y: 0 });
  });
});
