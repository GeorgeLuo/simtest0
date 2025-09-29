export type ComponentSnapshot = Record<string, unknown>;
export type EntitySnapshots = Record<number, ComponentSnapshot>;

export interface Frame {
  tick: number;
  entities: EntitySnapshots;
}

/**
 * Filters frame snapshots by removing disallowed component identifiers.
 */
export class FrameFilter {
  private readonly excluded: Set<string>;

  constructor(excludedComponents: Iterable<string> = []) {
    this.excluded = new Set(excludedComponents);
  }

  filter(frame: Frame): Frame {
    if (this.excluded.size === 0) {
      return {
        tick: frame.tick,
        entities: { ...frame.entities, ...Object.create(null) }
      };
    }

    const filteredEntities: EntitySnapshots = {};
    for (const [entityId, components] of Object.entries(frame.entities)) {
      const numericId = Number(entityId);
      const retained: ComponentSnapshot = {};
      for (const [componentId, snapshot] of Object.entries(components)) {
        if (!this.excluded.has(componentId)) {
          retained[componentId] = snapshot;
        }
      }

      filteredEntities[numericId] = retained;
    }

    return {
      tick: frame.tick,
      entities: filteredEntities
    };
  }
}
