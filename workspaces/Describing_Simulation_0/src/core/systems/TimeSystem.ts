import { System } from './System';
import { EntityManager } from '../entity/EntityManager';
import { ComponentManager } from '../components/ComponentManager';
import { ComponentType } from '../components/ComponentType';
import { TimeComponent } from '../components/TimeComponent';

const TIME_COMPONENT: ComponentType = 'core.time';

/**
 * Example system demonstrating how time could advance in the simulation.
 */
export class TimeSystem implements System {
  private tick = 0;

  update(entityManager: EntityManager, componentManager: ComponentManager): void {
    this.tick += 1;
    const entity = entityManager.createEntity(`time-${this.tick}`);
    componentManager.setComponent<TimeComponent>(entity.id, TIME_COMPONENT, { tick: this.tick });
  }
}

export { TIME_COMPONENT };
