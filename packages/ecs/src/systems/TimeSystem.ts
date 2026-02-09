import type { Entity } from '../entity/Entity';
import { TimeComponent } from '../components/TimeComponent';
import type { SystemContext } from './System';
import { System } from './System';

export class TimeSystem extends System {
  private timeEntity: Entity | undefined;

  initialize(context: SystemContext): void {
    if (this.timeEntity !== undefined) {
      return;
    }

    const entity = context.entityManager.create();
    this.timeEntity = entity;
    context.componentManager.addComponent(entity, TimeComponent, { tick: 0 });
  }

  update(context: SystemContext): void {
    if (this.timeEntity === undefined) {
      this.initialize(context);
    }

    const entity = this.timeEntity as Entity;
    const current = context.componentManager.getComponent(entity, TimeComponent);
    const nextTick = (current?.payload.tick ?? 0) + 1;

    context.componentManager.addComponent(entity, TimeComponent, { tick: nextTick });
  }
}
