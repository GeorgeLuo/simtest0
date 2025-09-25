import { EntityManager } from '../entity/EntityManager';
import { ComponentManager } from '../components/ComponentManager';

/**
 * Systems transform component data over time.
 */
export interface System {
  update(entityManager: EntityManager, componentManager: ComponentManager): void;
}
