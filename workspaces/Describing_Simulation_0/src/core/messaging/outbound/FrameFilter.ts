import type { Frame } from './Frame';

export class FrameFilter {
  private readonly blacklist: Set<string>;

  constructor(componentBlacklist: string[] = []) {
    this.blacklist = new Set(componentBlacklist);
  }

  apply(frame: Frame): Frame {
    if (this.blacklist.size === 0) {
      return {
        tick: frame.tick,
        entities: { ...frame.entities },
      };
    }

    const entities: Record<string, Record<string, unknown>> = {};
    for (const [entityId, components] of Object.entries(frame.entities)) {
      const filtered: Record<string, unknown> = {};
      for (const [componentId, value] of Object.entries(components as Record<string, unknown>)) {
        if (!this.blacklist.has(componentId)) {
          filtered[componentId] = value;
        }
      }
      entities[entityId] = filtered;
    }

    return {
      tick: frame.tick,
      entities,
    };
  }
}
