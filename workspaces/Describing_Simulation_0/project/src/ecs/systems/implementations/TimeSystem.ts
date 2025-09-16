import type { ComponentManager } from '../../components/ComponentManager.js';
import {
  timeComponentType,
  type TimeComponent,
} from '../../components/implementations/TimeComponent.js';
import type { System, SystemUpdateContext } from '../System.js';

// A system that keeps an entity's time component in sync with the simulation clock.
export class TimeSystem implements System {
  readonly id: string;

  private readonly componentManager: ComponentManager;
  private readonly entityId: number;
  private tickCount = 0;
  private lastDeltaTime = 0;
  private totalElapsedTime = 0;

  constructor(componentManager: ComponentManager, entityId: number, id = 'time') {
    this.id = id;
    this.componentManager = componentManager;
    this.entityId = entityId;
  }

  get ticks(): number {
    return this.tickCount;
  }

  get deltaTime(): number {
    return this.lastDeltaTime;
  }

  get elapsedTime(): number {
    return this.totalElapsedTime;
  }

  update(context: SystemUpdateContext): void {
    let timeComponent: TimeComponent | undefined = this.componentManager.getComponent(
      this.entityId,
      timeComponentType,
    );

    if (!timeComponent) {
      timeComponent = this.componentManager.attachComponent(
        this.entityId,
        timeComponentType,
      );
    }

    timeComponent = this.componentManager.updateComponent(
      this.entityId,
      timeComponentType,
      {
        ticks: timeComponent.ticks + timeComponent.deltaPerUpdate,
      },
    );

    this.tickCount = timeComponent.ticks;
    this.lastDeltaTime = context.deltaTime;
    this.totalElapsedTime = context.elapsedTime;
  }
}
