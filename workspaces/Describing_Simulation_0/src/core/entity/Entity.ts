/** Identifier for an entity within the simulation engine. */
export type EntityId = string;

/** Minimal entity structure capturing only an identifier. */
export interface Entity {
  id: EntityId;
}
