/** System primitive with lifecycle hooks */

import { EntityManager } from '../entity/EntityManager.js';
import { ComponentManager } from '../components/ComponentManager.js';

export class System {
  init(_entityManager: EntityManager, _componentManager: ComponentManager): void {}

  update(_entityManager: EntityManager, _componentManager: ComponentManager): void {
    throw new Error(`${this.constructor.name}.update must be implemented`);
  }

  destroy(_entityManager: EntityManager, _componentManager: ComponentManager): void {}
}
