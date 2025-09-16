import { TimeComponent } from '../../components/implementations/TimeComponent';
import { System } from '../System';

export class TimeSystem implements System {
  private nextEntityId = 0;
  private timeEntityId: number | null = null;
  private readonly timeComponents = new Map<number, TimeComponent>();

  init(): void {
    if (this.timeEntityId !== null) {
      return;
    }

    const entityId = this.allocateEntity();
    this.timeComponents.set(entityId, new TimeComponent());
    this.timeEntityId = entityId;
  }

  update(): void {
    if (this.timeEntityId === null) {
      this.init();
    }

    const component =
      this.timeEntityId !== null
        ? this.timeComponents.get(this.timeEntityId)
        : undefined;

    if (!component) {
      throw new Error('Time entity has not been initialized.');
    }

    component.ticks += 1;
  }

  destroy(): void {
    if (this.timeEntityId === null) {
      return;
    }

    this.timeComponents.delete(this.timeEntityId);
    this.timeEntityId = null;
  }

  getTimeEntityId(): number | null {
    return this.timeEntityId;
  }

  getTimeComponent(): TimeComponent | undefined {
    if (this.timeEntityId === null) {
      return undefined;
    }

    return this.timeComponents.get(this.timeEntityId);
  }

  private allocateEntity(): number {
    const id = this.nextEntityId;
    this.nextEntityId += 1;
    return id;
  }
}
