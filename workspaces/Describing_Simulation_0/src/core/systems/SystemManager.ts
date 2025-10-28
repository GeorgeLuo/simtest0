import type { EntityManager } from '../entity/EntityManager';
import type { ComponentManager } from '../components/ComponentManager';
import type { System, SystemContext } from './System';

export class SystemManager {
  private readonly systems: System[] = [];
  private readonly context: SystemContext;

  constructor(
    entityManager: EntityManager,
    componentManager: ComponentManager,
  ) {
    this.context = {
      entityManager,
      componentManager,
    };
  }

  /** Register a system at the end of the execution order or specified index. */
  addSystem(system: System, index?: number): void {
    const insertionIndex =
      index === undefined || index < 0 || index > this.systems.length
        ? this.systems.length
        : index;

    this.systems.splice(insertionIndex, 0, system);
    system.initialize(this.context);
  }

  /** Remove a system and trigger destroy lifecycle hook. */
  removeSystem(system: System): boolean {
    const idx = this.systems.indexOf(system);
    if (idx === -1) {
      return false;
    }

    this.systems.splice(idx, 1);
    system.destroy(this.context);
    return true;
  }

  /** Execute one update cycle across all systems in order. */
  runCycle(): void {
    for (const system of this.systems) {
      system.update(this.context);
    }
  }

  /** Retrieve current ordered list of systems. */
  getSystems(): System[] {
    return [...this.systems];
  }

  /** Expose the context passed into systems (entity/component managers). */
  getContext(): SystemContext {
    return this.context;
  }
}
