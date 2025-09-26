import { System } from './System';

interface SystemEntry {
  readonly system: System;
  readonly priority: number;
  readonly order: number;
}

/**
 * Coordinates registration, execution, and teardown of simulation systems.
 */
export class SystemManager {
  private readonly systems: SystemEntry[] = [];
  private nextOrder = 0;

  /**
   * Registers a system with an optional priority. Lower priorities execute first.
   */
  register(system: System, priority = 0): void {
    if (this.systems.some((entry) => entry.system === system)) {
      throw new Error('System is already registered.');
    }

    this.systems.push({ system, priority, order: this.nextOrder++ });
    this.sortSystems();
  }

  /**
   * Executes a single tick for all registered systems in their configured order.
   */
  tick(deltaTime: number): void {
    for (const entry of this.systems) {
      entry.system.tick(deltaTime);
    }
  }

  /**
   * Iterates through systems using the same ordering as updates.
   */
  forEach(callback: (system: System) => void): void {
    for (const entry of this.systems) {
      callback(entry.system);
    }
  }

  /**
   * Removes a system, invoking its teardown hook immediately.
   * Returns whether a system was removed.
   */
  remove(system: System): boolean {
    const index = this.systems.findIndex((entry) => entry.system === system);
    if (index === -1) {
      return false;
    }

    const [entry] = this.systems.splice(index, 1);
    entry.system.destroy();
    return true;
  }

  /**
   * Tears down every system, destroying them in reverse execution order.
   */
  destroyAll(): void {
    const entries = [...this.systems];
    this.systems.length = 0;

    for (let i = entries.length - 1; i >= 0; i -= 1) {
      entries[i].system.destroy();
    }
  }

  private sortSystems(): void {
    this.systems.sort((a, b) => {
      if (a.priority === b.priority) {
        return a.order - b.order;
      }

      return a.priority - b.priority;
    });
  }
}
