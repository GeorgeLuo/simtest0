import { describe, expect, it } from 'vitest';
import { System } from '../../../src/core/systems/System';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { ComponentManager } from '../../../src/core/components/ComponentManager';

const createManagers = () => {
  const entityManager = new EntityManager();
  const componentManager = new ComponentManager(entityManager);
  return { entityManager, componentManager };
};

describe('System base class', () => {
  it('exposes lifecycle hooks that can be overridden', () => {
    const { entityManager, componentManager } = createManagers();

    class ExampleSystem extends System {
      initialized = false;
      destroyed = false;

      constructor() {
        super('example');
      }

      override onInit(em: EntityManager, cm: ComponentManager): void {
        expect(em).toBe(entityManager);
        expect(cm).toBe(componentManager);
        this.initialized = true;
      }

      override update(em: EntityManager, cm: ComponentManager): void {
        expect(em).toBe(entityManager);
        expect(cm).toBe(componentManager);
      }

      override onDestroy(em: EntityManager, cm: ComponentManager): void {
        expect(em).toBe(entityManager);
        expect(cm).toBe(componentManager);
        this.destroyed = true;
      }
    }

    const system = new ExampleSystem();
    system.onInit(entityManager, componentManager);
    expect(system.initialized).toBe(true);

    system.update(entityManager, componentManager);

    system.onDestroy(entityManager, componentManager);
    expect(system.destroyed).toBe(true);
  });

  it('retains a stable identifier for scheduling', () => {
    class IdentifierSystem extends System {
      constructor() {
        super('identifier-system');
      }

      override update(): void {}
    }

    const system = new IdentifierSystem();
    expect(system.id).toBe('identifier-system');
  });
});
