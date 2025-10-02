import { ComponentType } from "../../core/components/ComponentType";

export interface CounterState {
  value: number;
}

export class CounterStateComponent extends ComponentType<CounterState> {
  constructor(id = "counter_state") {
    super(id);
  }
}
