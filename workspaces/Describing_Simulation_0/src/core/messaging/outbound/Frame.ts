/** A snapshot of entities and their component data for a simulation tick. */
export interface Frame {
  tick: number;
  entities: Record<string, Record<string, unknown>>;
}
