import { System } from "../System";
import { TimeComponentState } from "../../components/implementations/TimeComponent";

/**
 * Coordinates progression of simulation time using a time component.
 */
export abstract class TimeSystem extends System {
  public abstract getState(): TimeComponentState;

  public abstract step(elapsed: number): void;
}
