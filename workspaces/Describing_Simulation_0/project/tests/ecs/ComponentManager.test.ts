import { describe, expect, it } from 'vitest';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../src/ecs/components/ComponentType.js';

type PositionComponent = { x: number; y: number };
type VelocityComponent = { vx: number; vy: number };
type RenderComponent = {
  style: {
    color: {
      primary: string;
      secondary: string;
    };
    opacity: number;
  };
  visible: boolean;
};

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

const velocityType = createComponentType<VelocityComponent>({
  id: 'velocity',
  name: 'Velocity',
  description: 'Tracks entity velocity in 2D space.',
  schema: {
    vx: {
      description: 'Horizontal axis velocity.',
      defaultValue: 0,
    },
    vy: {
      description: 'Vertical axis velocity.',
      defaultValue: 0,
    },
  },
});

const renderType = createComponentType<RenderComponent>({
  id: 'render',
  name: 'Render Settings',
  description: 'Configures how an entity is drawn.',
  schema: {
    style: {
      description: 'Styling information for rendering.',
      defaultValue: {
        color: {
          primary: '#ffffff',
          secondary: '#000000',
        },
        opacity: 1,
      },
    },
    visible: {
      description: 'Whether the entity should be visible.',
      defaultValue: true,
    },
  },
});

describe('ComponentManager', () => {
  it('requires registration before attachments and allows attachments once registered', () => {
    const manager = new ComponentManager();
    const entityId = 42;
    const initialPosition: PositionComponent = { x: 5, y: -3 };

    expect(() => manager.attachComponent(entityId, positionType, initialPosition)).toThrow();

    expect(() => manager.registerType(positionType)).not.toThrow();

    const stored = manager.attachComponent(entityId, positionType, initialPosition);

    expect(stored).toEqual(initialPosition);
    expect(manager.getComponent(entityId, positionType)).toEqual(initialPosition);
  });

  it('propagates updates to the owning entity without affecting others', () => {
    const manager = new ComponentManager();
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
    const manager = new ComponentManager();
    const entityId = 99;

    manager.registerType(positionType);

    const component = manager.attachComponent(entityId, positionType);

    expect(component).toEqual({ x: 0, y: 0 });
    expect(manager.getComponent(entityId, positionType)).toEqual({ x: 0, y: 0 });
  });

  it('returns the identifiers of entities with a component attached for a type', () => {
    const manager = new ComponentManager();
    const entityA = 5;
    const entityB = 6;
    const entityC = 7;

    manager.registerType(positionType);

    manager.attachComponent(entityA, positionType, { x: 1, y: 1 });
    manager.attachComponent(entityC, positionType, { x: -4, y: 2 });

    const entities = manager.getEntitiesWith(positionType);

    expect(entities).toEqual([entityA, entityC]);
    expect(entities).not.toContain(entityB);
  });

  it('removes a specific component without affecting other entities', () => {
    const manager = new ComponentManager();
    const entityA = 11;
    const entityB = 12;
    const initialA: PositionComponent = { x: 2, y: 3 };
    const initialB: PositionComponent = { x: 4, y: 6 };

    manager.registerType(positionType);
    manager.attachComponent(entityA, positionType, initialA);
    manager.attachComponent(entityB, positionType, initialB);

    const removed = manager.removeComponent(entityA, positionType);

    expect(removed).toBe(true);
    expect(manager.getComponent(entityA, positionType)).toBeUndefined();
    expect(manager.getComponent(entityB, positionType)).toEqual(initialB);
    expect(manager.getEntitiesWith(positionType)).toEqual([entityB]);
  });

  it('clears all components for an entity across registered types', () => {
    const manager = new ComponentManager();
    const entityA = 21;
    const entityB = 22;

    manager.registerType(positionType);
    manager.registerType(velocityType);

    manager.attachComponent(entityA, positionType, { x: 9, y: 9 });
    manager.attachComponent(entityA, velocityType, { vx: 3, vy: 4 });
    manager.attachComponent(entityB, positionType, { x: 0, y: 0 });

    manager.removeAllComponents(entityA);

    expect(manager.getComponent(entityA, positionType)).toBeUndefined();
    expect(manager.getComponent(entityA, velocityType)).toBeUndefined();
    expect(manager.getComponent(entityB, positionType)).toEqual({ x: 0, y: 0 });
    expect(manager.getEntitiesWith(positionType)).toEqual([entityB]);
    expect(manager.getEntitiesWith(velocityType)).toEqual([]);
  });

  it('merges nested component updates deeply', () => {
    const manager = new ComponentManager();
    const entityId = 31;
    const initial: RenderComponent = {
      style: {
        color: {
          primary: '#111111',
          secondary: '#222222',
        },
        opacity: 0.75,
      },
      visible: true,
    };

    manager.registerType(renderType);
    manager.attachComponent(entityId, renderType, initial);

    const updated = manager.updateComponent(
      entityId,
      renderType,
      {
        style: {
          color: {
            primary: '#ff0000',
          },
        },
      } as Partial<RenderComponent>,
    );

    expect(updated).toEqual({
      style: {
        color: {
          primary: '#ff0000',
          secondary: '#222222',
        },
        opacity: 0.75,
      },
      visible: true,
    });
    expect(manager.getComponent(entityId, renderType)).toEqual({
      style: {
        color: {
          primary: '#ff0000',
          secondary: '#222222',
        },
        opacity: 0.75,
      },
      visible: true,
    });
  });
});
