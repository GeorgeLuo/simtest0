import { ComponentState, ComponentType } from "../ComponentType";

export interface TimeComponentState extends ComponentState {
  readonly tick: number;
  readonly delta?: number;
}

/**
 * Defines the time component that tracks simulation tick metadata.
 */
export abstract class TimeComponent extends ComponentType<TimeComponentState> {
  public abstract advance(state: TimeComponentState, elapsed: number): TimeComponentState;
}
