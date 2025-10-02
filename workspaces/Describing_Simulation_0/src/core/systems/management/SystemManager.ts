import type { System } from "../System";

export class SystemManager {
  #systems: System[] = [];
  #initialized = new WeakSet<System>();
  #started = false;

  add(system: System, order?: number): void {
    if (this.#systems.includes(system)) {
      return;
    }

    if (order === undefined || order < 0 || order >= this.#systems.length) {
      this.#systems.push(system);
    } else {
      this.#systems.splice(order, 0, system);
    }

    if (this.#started && !this.#initialized.has(system)) {
      system.initialize();
      this.#initialized.add(system);
    }
  }

  start(): void {
    if (this.#started) {
      return;
    }

    for (const system of this.#systems) {
      if (!this.#initialized.has(system)) {
        system.initialize();
        this.#initialized.add(system);
      }
    }

    this.#started = true;
  }

  tick(): void {
    if (!this.#started) {
      return;
    }

    for (const system of this.#systems) {
      system.update();
    }
  }

  remove(system: System): void {
    const index = this.#systems.indexOf(system);
    if (index === -1) {
      return;
    }

    this.#systems.splice(index, 1);

    if (this.#initialized.has(system)) {
      system.destroy();
      this.#initialized.delete(system);
    }
  }

  clear(): void {
    for (const system of this.#systems) {
      if (this.#initialized.has(system)) {
        system.destroy();
      }
    }

    this.#systems = [];
    this.#initialized = new WeakSet();
    this.#started = false;
  }

  list(): ReadonlyArray<System> {
    return [...this.#systems];
  }
}
