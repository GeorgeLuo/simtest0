import { System } from "./System";

/**
 * Coordinates ordering and execution of systems within the simulation loop.
 */
export abstract class SystemManager {
  public abstract register(system: System): void;

  public abstract unregister(systemId: string): void;

  public abstract get(systemId: string): System | undefined;

  public abstract getExecutionOrder(): Iterable<System>;
}
