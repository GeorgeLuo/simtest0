import { Entity } from './Entity';

/**
 * Tracks the lifecycle of {@link Entity} instances in the simulation.
 */
export class EntityManager {
  private readonly entities = new Map<string, Entity>();
  private nextId = 1;

  /**
   * Creates a new {@link Entity}. When an explicit id is not provided a
   * sequential identifier is generated.
   */
  create(explicitId?: string): Entity {
    const id = explicitId ?? this.generateId();

    if (this.entities.has(id)) {
      throw new Error(`Entity with id "${id}" already exists.`);
    }

    const entity = new Entity(id);
    this.entities.set(id, entity);
    return entity;
  }

  /**
   * Retrieves an {@link Entity} by its identifier.
   */
  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Checks whether an {@link Entity} exists.
   */
  has(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * Removes an {@link Entity} from the manager.
   *
   * @returns `true` when the entity existed and has been removed.
   */
  remove(id: string): boolean {
    return this.entities.delete(id);
  }

  /**
   * Provides a snapshot of all entities managed by the instance.
   */
  list(): Entity[] {
    return Array.from(this.entities.values());
  }

  private generateId(): string {
    return `entity-${this.nextId++}`;
  }
}
