import { EntityManager } from "./entity/EntityManager";
import { ComponentManager } from "./components/ComponentManager";
import { SystemManager } from "./systems/SystemManager";

/**
 * Orchestrates the execution of the simulation by coordinating managers and
 * lifecycle operations.
 */
export abstract class Player {
  public constructor(
    protected readonly entities: EntityManager,
    protected readonly components: ComponentManager,
    protected readonly systems: SystemManager,
  ) {}

  public abstract initialize(): void;

  public abstract start(): void;

  public abstract pause(): void;

  public abstract stop(): void;
}
