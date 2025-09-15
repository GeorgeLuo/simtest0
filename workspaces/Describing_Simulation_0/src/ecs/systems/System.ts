/**
 * Base abstraction for a simulation system responsible for mutating state on
 * each simulation tick.
 */
export abstract class System {
  public abstract readonly id: string;

  public abstract initialize(): void;

  public abstract update(deltaTime: number): void;

  public abstract shutdown(): void;
}
