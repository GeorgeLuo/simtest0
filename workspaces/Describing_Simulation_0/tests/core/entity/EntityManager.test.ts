import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { ComponentType, ComponentInstance } from '../../../src/core/components/ComponentType';
import { Entity } from '../../../src/core/entity/Entity';

interface PositionData {
  x: number;
}

class PositionComponentType extends ComponentType<PositionData> {
  constructor() {
    super('position');
  }

  protected validate(data: PositionData): void {
    if (!Number.isFinite(data.x)) {
      throw new Error('Position x must be a finite number');
    }
  }

  override create(entity: Entity, data: PositionData): ComponentInstance<PositionData> {
    this.validate(data);
    return { entity, type: this, data: { ...data } };
  }
}

describe('EntityManager', () => {
  let entityManager: EntityManager;
  let componentManager: ComponentManager;
  let positionType: PositionComponentType;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentManager = new ComponentManager(entityManager);
    positionType = new PositionComponentType();
  });

  it('creates unique entity identifiers', () => {
    const first = entityManager.createEntity();
    const second = entityManager.createEntity();

    expect(first).not.toBe(second);
    expect(entityManager.listEntities()).toEqual([first, second]);
  });

  it('removes entities and reports absence afterwards', () => {
    const entity = entityManager.createEntity();
    expect(entityManager.hasEntity(entity)).toBe(true);

    entityManager.removeEntity(entity);

    expect(entityManager.hasEntity(entity)).toBe(false);
    expect(entityManager.listEntities()).not.toContain(entity);
  });

  it('triggers component cleanup when removing an entity', () => {
    const entity = entityManager.createEntity();
    componentManager.addComponent(entity, positionType, { x: 10 });
    const removeSpy = vi.spyOn(componentManager, 'removeAll');

    entityManager.removeEntity(entity);

    expect(removeSpy).toHaveBeenCalledWith(entity);
    expect(componentManager.getComponents(entity)).toEqual([]);
  });

  it('lists active entities in creation order', () => {
    const first = entityManager.createEntity();
    const second = entityManager.createEntity();
    const third = entityManager.createEntity();

    entityManager.removeEntity(second);

    expect(entityManager.listEntities()).toEqual([first, third]);
  });
});
