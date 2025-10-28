/**
 * Entity identifiers represent concrete instances in the simulation.
 * For the primitives checkpoint we model them as opaque numeric ids.
 */
export type Entity = number;

/**
 * Utility factory to generate new entity identifiers. Concrete creation
 * semantics live in the EntityManager; this helper exists to clarify
 * the shape of an entity id for implementers.
 */
export const createEntityId = (value: number): Entity => value;
