import { ComponentType } from "./ComponentType.js";

export interface TimeComponentState {
  tick: number;
}

export const TIME_COMPONENT = new ComponentType<TimeComponentState>(
  "core.time",
);

