import { ComponentType } from "../ComponentType";

export interface TimeState {
  tick: number;
}

export class TimeComponent extends ComponentType<TimeState> {}
