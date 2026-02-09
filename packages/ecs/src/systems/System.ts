import type { EntityManager } from '../entity/EntityManager';
import type { ComponentManager } from '../components/ComponentManager';

/**
 * Context passed into system lifecycle hooks.
 */
export interface SystemContext {
  entityManager: EntityManager;
  componentManager: ComponentManager;
}

/**
 * Base representation of a system within the ECS engine. Systems are
 * stateless by design and mutate the environment via managers.
 */
export abstract class System {
  /** Optional hook invoked once when the system is added to the engine. */
  initialize(_context: SystemContext): void {
    // default no-op
  }

  /** Required update method executed each simulation tick. */
  abstract update(context: SystemContext): void;

  /** Optional hook invoked when the system is removed from the engine. */
  destroy(_context: SystemContext): void {
    // default no-op
  }
}
