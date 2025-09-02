/** TimeSystem increments global time each update */
import { System } from '../System.js';
import { EntityManager } from '../../entity/EntityManager.js';
import { ComponentManager } from '../../components/ComponentManager.js';
import { TimeComponent } from '../../components/implementations/TimeComponent.js';

export class TimeSystem extends System {
  private timeEntity!: number;

  init(em: EntityManager, cm: ComponentManager): void {
    this.timeEntity = em.createEntity();
    cm.addComponent(this.timeEntity, TimeComponent, { value: 0 });
  }

  update(_em: EntityManager, cm: ComponentManager): void {
    const comp = cm.getComponent(this.timeEntity, TimeComponent);
    if (!comp) {
      throw new Error('Time component not found');
    }
    comp.value++;
  }
}
