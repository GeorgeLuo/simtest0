import type {
  System,
  SystemLifecycleContext,
  SystemUpdateContext,
} from './System.js';

// Coordinates the execution of registered systems in a deterministic order.
export class SystemManager {
  private readonly systems: System[] = [];
  private readonly systemsById = new Map<string, System>();
  private elapsedTime = 0;

  register(system: System): void {
    if (this.systemsById.has(system.id)) {
      throw new Error(`System with id "${system.id}" is already registered`);
    }

    this.systems.push(system);
    this.systemsById.set(system.id, system);
  }

  unregister(id: string): boolean {
    const system = this.systemsById.get(id);
    if (!system) {
      return false;
    }

    this.systemsById.delete(id);

    const index = this.systems.indexOf(system);
    if (index >= 0) {
      this.systems.splice(index, 1);
    }

    return true;
  }

  has(systemId: string): boolean {
    return this.systemsById.has(systemId);
  }

  get(systemId: string): System | undefined {
    return this.systemsById.get(systemId);
  }

  getAll(): System[] {
    return this.systems.slice();
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  async initializeAll(): Promise<void> {
    for (const system of this.systems) {
      if (!system.initialize) {
        continue;
      }

      const context: SystemLifecycleContext = {
        elapsedTime: this.elapsedTime,
      };
      await system.initialize(context);
    }
  }

  async shutdownAll(): Promise<void> {
    for (const system of [...this.systems].reverse()) {
      if (!system.shutdown) {
        continue;
      }

      const context: SystemLifecycleContext = {
        elapsedTime: this.elapsedTime,
      };
      await system.shutdown(context);
    }
  }

  async update(deltaTime: number): Promise<void> {
    if (deltaTime < 0) {
      throw new Error('deltaTime must be a non-negative number');
    }

    this.elapsedTime += deltaTime;

    for (const system of this.systems) {
      const context: SystemUpdateContext = {
        deltaTime,
        elapsedTime: this.elapsedTime,
      };

      await system.update(context);
    }
  }
}
