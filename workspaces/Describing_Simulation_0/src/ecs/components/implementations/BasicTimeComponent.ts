import { TimeComponent, TimeComponentState } from "./TimeComponent";

export interface BasicTimeComponentState extends TimeComponentState {
  readonly delta: number;
}

export const BASIC_TIME_COMPONENT_TYPE = "core/time/basic";

/**
 * Concrete time component storing the current tick and frame delta values.
 */
export class BasicTimeComponent extends TimeComponent {
  public constructor() {
    super(BASIC_TIME_COMPONENT_TYPE);
  }

  public create(initialState: Partial<BasicTimeComponentState> = {}): BasicTimeComponentState {
    return {
      tick: initialState.tick ?? 0,
      delta: initialState.delta ?? 0,
    };
  }

  public clone(state: BasicTimeComponentState): BasicTimeComponentState {
    return {
      tick: state.tick,
      delta: state.delta,
    };
  }

  public advance(state: TimeComponentState, elapsed: number): BasicTimeComponentState {
    const currentState = state as BasicTimeComponentState;

    return {
      tick: currentState.tick + 1,
      delta: elapsed,
    };
  }
}
