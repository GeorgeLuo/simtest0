import { EntityManager } from '../entity/EntityManager';
import { ComponentManager } from '../components/ComponentManager';

/**
 * Base class for simulation systems. Systems mutate the world via entity and component managers
 * and can react to lifecycle hooks during registration and teardown.
 */
export abstract class System {
  constructor(public readonly id: string) {}

  onInit(entityManager: EntityManager, componentManager: ComponentManager): void {
    // Default no-op implementation; override in subclasses when needed.
  }

  abstract update(entityManager: EntityManager, componentManager: ComponentManager): void;

  onDestroy(entityManager: EntityManager, componentManager: ComponentManager): void {
    // Default no-op implementation; override in subclasses when needed.
  }
}
