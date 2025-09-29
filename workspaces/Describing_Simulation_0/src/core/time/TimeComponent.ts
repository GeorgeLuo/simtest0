import { ComponentType } from '../components/ComponentType';
import { Entity } from '../entity/Entity';

export interface TimeData {
  tick: number;
}

/**
 * Component tracking the current tick of simulation time.
 */
export class TimeComponentType extends ComponentType<TimeData> {
  static readonly ID = 'core.time';

  constructor() {
    super(TimeComponentType.ID);
  }

  protected override validate(data: TimeData): void {
    if (!Number.isInteger(data.tick) || data.tick < 0) {
      throw new Error('Time tick must be a non-negative integer');
    }
  }

  override create(entity: Entity, data: TimeData) {
    return super.create(entity, { tick: data.tick });
  }
}
