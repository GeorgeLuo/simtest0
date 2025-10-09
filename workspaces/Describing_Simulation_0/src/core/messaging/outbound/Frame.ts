// Skeleton for Frame structure capturing simulation state snapshots.
export interface Frame {
  tick: number;
  entities: Record<string, unknown>;
}
