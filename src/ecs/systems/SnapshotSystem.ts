import { System } from '../ECS';
import { ComponentManager } from '../components/ComponentManager';

export class SnapshotSystem implements System {
  private history: Array<Record<number, Record<string, unknown>>> = [];

  constructor(private components: ComponentManager) {}

  update(): void {
    const snapshot: Record<number, Record<string, unknown>> = {};
    this.components.forEachEntity((entity, comps) => {
      snapshot[entity] = {};
      comps.forEach((value, key) => {
        snapshot[entity][key] = value;
      });
    });
    this.history.push(snapshot);
  }

  getSnapshots(): Array<Record<number, Record<string, unknown>>> {
    return this.history;
  }
}

export default SnapshotSystem;
