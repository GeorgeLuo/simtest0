import type { ComponentType } from './ComponentType';

// Skeleton for TimeComponent contract. Implementation to follow in Checkpoint III Stage 4.
export interface TimePayload {
  tick: number;
}

export const TimeComponent: ComponentType<TimePayload> = {
  id: 'core.time',
  description: 'Tracks the current simulation tick.',
  validate(payload: TimePayload): boolean {
    if (payload == null) {
      return false;
    }

    const { tick } = payload;
    return Number.isInteger(tick) && tick >= 0;
  },
};
