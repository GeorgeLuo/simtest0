import { beforeEach, describe, expect, it } from 'vitest';
import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { ComponentType, ComponentInstance } from '../../../src/core/components/ComponentType';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { Entity } from '../../../src/core/entity/Entity';

type VelocityData = { magnitude: number };

type MassData = { value: number };

class VelocityComponentType extends ComponentType<VelocityData> {
  constructor() {
    super('velocity');
  }

  protected validate(data: VelocityData): void {
    if (!Number.isFinite(data.magnitude)) {
      throw new Error('Velocity magnitude must be finite');
    }
  }

  override create(entity: Entity, data: VelocityData): ComponentInstance<VelocityData> {
    this.validate(data);
    return { entity, type: this, data: { ...data } };
  }
}

class MassComponentType extends ComponentType<MassData> {
  constructor() {
    super('mass');
  }

  protected validate(data: MassData): void {
    if (data.value <= 0) {
      throw new Error('Mass must be positive');
    }
  }
}

describe('ComponentManager', () => {
  let entityManager: EntityManager;
  let componentManager: ComponentManager;
  let velocity: VelocityComponentType;
  let mass: MassComponentType;
  let entity: Entity;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentManager = new ComponentManager(entityManager);
    velocity = new VelocityComponentType();
    mass = new MassComponentType();
    entity = entityManager.createEntity();
  });

  it('links components to entities and prevents duplicates per type', () => {
    const instance = componentManager.addComponent(entity, velocity, { magnitude: 3 });
    expect(instance.data).toEqual({ magnitude: 3 });

    expect(() => componentManager.addComponent(entity, velocity, { magnitude: 4 })).toThrow('Component already exists for entity');
  });

  it('retrieves components by entity and type', () => {
    componentManager.addComponent(entity, velocity, { magnitude: 5 });
    const retrieved = componentManager.getComponent(entity, velocity);

    expect(retrieved?.data).toEqual({ magnitude: 5 });
  });

  it('returns all components for an entity', () => {
    componentManager.addComponent(entity, velocity, { magnitude: 5 });
    componentManager.addComponent(entity, mass, { value: 10 });

    const components = componentManager.getComponents(entity);
    expect(components.map((c) => c.type.id).sort()).toEqual(['mass', 'velocity']);
  });

  it('finds all entities containing a given component type', () => {
    const second = entityManager.createEntity();
    componentManager.addComponent(entity, velocity, { magnitude: 1 });
    componentManager.addComponent(second, velocity, { magnitude: 2 });

    expect(componentManager.getEntitiesWith(velocity)).toEqual([entity, second]);
  });

  it('removes specific components without affecting others', () => {
    componentManager.addComponent(entity, velocity, { magnitude: 1 });
    componentManager.addComponent(entity, mass, { value: 5 });

    componentManager.removeComponent(entity, velocity);

    expect(componentManager.getComponent(entity, velocity)).toBeUndefined();
    expect(componentManager.getComponent(entity, mass)).toBeDefined();
  });

  it('clears all components when requested', () => {
    componentManager.addComponent(entity, velocity, { magnitude: 1 });
    componentManager.addComponent(entity, mass, { value: 5 });

    componentManager.removeAll(entity);

    expect(componentManager.getComponents(entity)).toEqual([]);
  });
});
