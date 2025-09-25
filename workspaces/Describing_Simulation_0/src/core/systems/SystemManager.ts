import { System } from './System';

/**
 * Maintains system ordering and lifecycle hooks.
 */
export class SystemManager {
  private readonly systems: System[] = [];

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index >= 0) {
      this.systems.splice(index, 1);
    }
  }

  runAll(): void {
    // The actual implementation will inject managers when available.
  }

  list(): readonly System[] {
    return this.systems;
  }
}
