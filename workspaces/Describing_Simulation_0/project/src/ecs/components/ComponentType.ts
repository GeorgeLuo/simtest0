// Describes the metadata and construction contract for a component kind.
export interface ComponentType<T = unknown> {
  /**
   * Runtime identifier for the component kind. This value must be unique across
   * all registered component types to ensure deterministic lookups.
   */
  id: string;
  /**
   * Factory function that produces a component instance. Implementations can use
   * this hook to enforce defaults or clone inbound data before storage.
   */
  create?(initial: T): T;
}
