import { System } from './System';

type RegisteredSystem = {
  system: System;
  order: number;
  initialized: boolean;
};

export class SystemManager {
  private systems: RegisteredSystem[] = [];

  register(system: System, order = 0): void {
    if (this.systems.some((entry) => entry.system === system)) {
      throw new Error('System is already registered.');
    }

    this.systems.push({ system, order, initialized: false });
    this.systems.sort((a, b) => a.order - b.order);
  }

  initAll(): void {
    for (const entry of this.systems) {
      if (!entry.initialized) {
        entry.system.init();
        entry.initialized = true;
      }
    }
  }

  updateAll(): void {
    for (const entry of this.systems) {
      if (!entry.initialized) {
        entry.system.init();
        entry.initialized = true;
      }

      entry.system.update();
    }
  }

  destroyAll(): void {
    for (let index = this.systems.length - 1; index >= 0; index -= 1) {
      const entry = this.systems[index];

      if (entry.initialized) {
        entry.system.destroy();
        entry.initialized = false;
      }
    }
  }

  clear(): void {
    this.destroyAll();
    this.systems = [];
  }

  getRegisteredSystems(): ReadonlyArray<System> {
    return this.systems.map((entry) => entry.system);
  }
}
