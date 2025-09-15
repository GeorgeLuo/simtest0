export type EntityId = string;

/**
 * Base representation of an entity within the simulation. Concrete
 * implementations are expected to manage component attachments and any
 * entity-specific bookkeeping.
 */
export abstract class Entity {
  public constructor(public readonly id: EntityId) {}

  public abstract addComponent(componentType: string, componentData: unknown): void;

  public abstract removeComponent(componentType: string): void;

  public abstract getComponent<T = unknown>(componentType: string): T | undefined;

  public abstract listComponents(): string[];
}
