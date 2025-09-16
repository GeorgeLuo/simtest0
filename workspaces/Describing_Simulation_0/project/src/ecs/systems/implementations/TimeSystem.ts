import type { ComponentManager } from '../../components/ComponentManager.js';
import { timeComponentType } from '../../components/implementations/TimeComponent.js';
import type { TimeComponent } from '../../components/implementations/TimeComponent.js';
import type { EntityManager } from '../../entity/EntityManager.js';
import type { System, SystemUpdateContext } from '../System.js';

// Coordinates the attachment of a time component to an entity and keeps the
// component in sync with the simulation's update loop.
export class TimeSystem implements System {
  readonly id: string;

  private readonly entityManager: EntityManager;
  private readonly componentManager: ComponentManager;
  private timeEntityId: number;

  private lastDeltaTime = 0;
  private totalElapsedTime = 0;

  constructor(
    entityManager: EntityManager,
    componentManager: ComponentManager,
    id = 'time',
  ) {
    this.id = id;
    this.entityManager = entityManager;
    this.componentManager = componentManager;

    this.timeEntityId = this.ensureTimeEntity();
  }

  get ticks(): number {
    return this.requireTimeComponent().ticks;
  }

  get deltaTime(): number {
    return this.lastDeltaTime;
  }

  get elapsedTime(): number {
    return this.totalElapsedTime;
  }

  update(context: SystemUpdateContext): void {
    this.lastDeltaTime = context.deltaTime;
    this.totalElapsedTime = context.elapsedTime;

    const component = this.requireTimeComponent();
    const ticks = component.ticks + component.deltaPerUpdate;

    this.componentManager.updateComponent(this.timeEntityId, timeComponentType, {
      ticks,
    });
  }

  private ensureTimeEntity(): number {
    const existingEntities = this.componentManager.getEntitiesWith(timeComponentType);
    if (existingEntities.length > 0) {
      return existingEntities[0]!;
    }

    const entity = this.entityManager.create();
    entity.attachComponent(this.componentManager, timeComponentType);
    return entity.id;
  }

  private requireTimeComponent(): TimeComponent {
    const component = this.componentManager.getComponent(
      this.timeEntityId,
      timeComponentType,
    );

    if (!component) {
      throw new Error('Time component has not been attached to the time entity');
    }

    return component;
  }
}
