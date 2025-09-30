import { Entity } from '../entity/Entity.js';

/**
 * A component instance ties an entity to a payload described by a component type.
 */
export interface ComponentInstance<TData> {
  readonly entity: Entity;
  readonly type: ComponentType<TData>;
  data: TData;
}

/**
 * Component types act as factories and descriptors for component instances.
 * Concrete implementations should override validation rules to keep component state
 * consistent across the simulation.
 */
export abstract class ComponentType<TData> {
  constructor(public readonly id: string) {}

  protected validate(data: TData): void {
    // Default implementation accepts all payloads.
  }

  create(entity: Entity, data: TData): ComponentInstance<TData> {
    this.validate(data);
    return { entity, type: this, data };
  }
}
