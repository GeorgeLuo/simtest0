import { EntityManager } from '../entity/EntityManager.js';
import { ComponentManager } from '../components/ComponentManager.js';
import { System } from './System.js';

/**
 * Manages the ordered execution of systems and coordinates their lifecycle hooks.
 */
export class SystemManager {
  private readonly systems: System[] = [];
  private readonly systemsById = new Map<string, System>();

  constructor(
    private readonly entityManager: EntityManager,
    private readonly componentManager: ComponentManager
  ) {}

  addSystem(system: System, index?: number): void {
    if (this.systemsById.has(system.id)) {
      throw new Error(`System with id ${system.id} already exists`);
    }

    const insertionIndex = this.normalizeIndex(index);
    this.systems.splice(insertionIndex, 0, system);
    this.systemsById.set(system.id, system);
    system.onInit(this.entityManager, this.componentManager);
  }

  removeSystem(id: string): void {
    const system = this.systemsById.get(id);
    if (!system) {
      return;
    }

    this.systemsById.delete(id);
    const index = this.systems.findIndex((candidate) => candidate.id === id);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }

    system.onDestroy(this.entityManager, this.componentManager);
  }

  tick(): void {
    for (const system of this.systems) {
      system.update(this.entityManager, this.componentManager);
    }
  }

  listSystems(): readonly System[] {
    return [...this.systems];
  }

  hasSystem(id: string): boolean {
    return this.systemsById.has(id);
  }

  private normalizeIndex(index?: number): number {
    if (index === undefined || Number.isNaN(index)) {
      return this.systems.length;
    }

    if (index < 0) {
      return 0;
    }

    if (index > this.systems.length) {
      return this.systems.length;
    }

    return index;
  }
}
