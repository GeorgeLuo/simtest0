import type { System, SystemUpdateContext } from '../System.js';

// A minimal system that tracks how many update ticks have occurred.
export class TimeSystem implements System {
  readonly id: string;

  private tickCount = 0;
  private lastDeltaTime = 0;
  private totalElapsedTime = 0;

  constructor(id = 'time') {
    this.id = id;
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
    this.tickCount += 1;
    this.lastDeltaTime = context.deltaTime;
    this.totalElapsedTime = context.elapsedTime;
  }
}
