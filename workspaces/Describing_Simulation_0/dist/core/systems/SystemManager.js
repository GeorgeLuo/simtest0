export class SystemManager {
    systems = [];
    nextId = 1;
    addSystem(system, indexOrOptions) {
        const options = typeof indexOrOptions === "number"
            ? { index: indexOrOptions }
            : indexOrOptions ?? {};
        const id = options.id ?? `system-${this.nextId++}`;
        if (this.systems.some((entry) => entry.id === id)) {
            throw new Error(`System with id '${id}' is already registered`);
        }
        const entry = { id, instance: system };
        const insertionIndex = options.index === undefined
            ? this.systems.length
            : Math.min(Math.max(options.index, 0), this.systems.length);
        this.systems.splice(insertionIndex, 0, entry);
        system.onInit();
        return id;
    }
    removeSystem(id) {
        const position = this.systems.findIndex((entry) => entry.id === id);
        if (position === -1) {
            return;
        }
        const [entry] = this.systems.splice(position, 1);
        entry.instance.onDestroy();
    }
    getSystems() {
        return [...this.systems];
    }
    clear() {
        while (this.systems.length > 0) {
            const { id } = this.systems[0];
            this.removeSystem(id);
        }
    }
}
