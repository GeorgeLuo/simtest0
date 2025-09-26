import type { ComponentManager } from 'src/core/components/ComponentManager';
import type { EntityManager } from 'src/core/entity/EntityManager';
import { System } from 'src/core/systems/System';
import { TIME_COMPONENT } from 'src/core/components/TimeComponent';
import {
  RAIN_STATE_COMPONENT,
  type RainStateComponent,
} from '../components';

export interface RainScheduleEntry {
  /** Timestamp in seconds since the beginning of the simulation. */
  readonly timeSeconds: number;
  /** Rain intensity (mm/hr) at the provided timestamp. */
  readonly intensityMmPerHour: number;
}

function sortSchedule(entries: readonly RainScheduleEntry[]): RainScheduleEntry[] {
  return [...entries].sort((a, b) => a.timeSeconds - b.timeSeconds);
}

/**
 * Applies a piecewise linear rainfall schedule to the target entity.
 */
export class RainScheduleSystem extends System {
  private readonly schedule: RainScheduleEntry[];

  constructor(
    private readonly entityId: string,
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
    schedule: readonly RainScheduleEntry[],
  ) {
    super();
    if (schedule.length === 0) {
      throw new Error('A rainfall schedule requires at least one entry.');
    }
    this.schedule = sortSchedule(schedule);
  }

  protected override onInit(): void {
    if (!this.entities.has(this.entityId)) {
      this.entities.create(this.entityId);
    }

    if (!this.components.isRegistered(RAIN_STATE_COMPONENT)) {
      this.components.register(RAIN_STATE_COMPONENT);
    }

    const first = this.schedule[0];
    const initialState: RainStateComponent = {
      intensityMmPerHour: first.intensityMmPerHour,
    };

    this.components.setComponent(
      this.entityId,
      RAIN_STATE_COMPONENT,
      initialState,
    );
  }

  protected override update(): void {
    const time =
      this.components.getComponent('time', TIME_COMPONENT)?.elapsed ?? 0;
    const intensity = this.interpolateIntensity(time);

    const current = this.components.getComponent(
      this.entityId,
      RAIN_STATE_COMPONENT,
    );

    if (!current || current.intensityMmPerHour !== intensity) {
      this.components.setComponent(this.entityId, RAIN_STATE_COMPONENT, {
        intensityMmPerHour: intensity,
      });
    }
  }

  private interpolateIntensity(timeSeconds: number): number {
    if (timeSeconds <= this.schedule[0].timeSeconds) {
      return this.schedule[0].intensityMmPerHour;
    }

    for (let i = 0; i < this.schedule.length - 1; i += 1) {
      const current = this.schedule[i];
      const next = this.schedule[i + 1];

      if (timeSeconds <= next.timeSeconds) {
        const segmentDuration = next.timeSeconds - current.timeSeconds;
        if (segmentDuration <= 0) {
          return next.intensityMmPerHour;
        }

        const progress =
          (timeSeconds - current.timeSeconds) / segmentDuration;

        return (
          current.intensityMmPerHour +
          progress * (next.intensityMmPerHour - current.intensityMmPerHour)
        );
      }
    }

    return this.schedule[this.schedule.length - 1].intensityMmPerHour;
  }
}
