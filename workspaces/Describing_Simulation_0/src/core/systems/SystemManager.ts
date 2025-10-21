import { System } from "./System.js";

export interface RegisteredSystem<TSystem extends System = System> {
  readonly id: string;
  readonly instance: TSystem;
}

export class SystemManager {
  private readonly systems: RegisteredSystem[] = [];
  private nextId = 1;

  addSystem(
    system: System,
    indexOrOptions?: number | { index?: number; id?: string },
  ): string {
    const options =
      typeof indexOrOptions === "number"
        ? { index: indexOrOptions }
        : indexOrOptions ?? {};

    const id = options.id ?? `system-${this.nextId++}`;
    if (this.systems.some((entry) => entry.id === id)) {
      throw new Error(`System with id '${id}' is already registered`);
    }

    const entry: RegisteredSystem = { id, instance: system };

    const insertionIndex =
      options.index === undefined
        ? this.systems.length
        : Math.min(Math.max(options.index, 0), this.systems.length);
    this.systems.splice(insertionIndex, 0, entry);

    system.onInit();

    return id;
  }

  removeSystem(id: string): void {
    const position = this.systems.findIndex((entry) => entry.id === id);
    if (position === -1) {
      return;
    }

    const [entry] = this.systems.splice(position, 1);
    entry.instance.onDestroy();
  }

  getSystems(): RegisteredSystem[] {
    return [...this.systems];
  }

  clear(): void {
    while (this.systems.length > 0) {
      const { id } = this.systems[0];
      this.removeSystem(id);
    }
  }
}
