import { describe, expect, it, vi } from "vitest";
import { System } from "../systems/System.js";
import { SystemManager } from "../systems/SystemManager.js";
const makeStubSystem = () => {
    const hooks = {
        init: vi.fn(),
        destroy: vi.fn(),
        update: vi.fn(),
    };
    class StubSystem extends System {
        onInit() {
            hooks.init();
        }
        update() {
            hooks.update();
        }
        onDestroy() {
            hooks.destroy();
        }
    }
    return { system: new StubSystem(), hooks };
};
describe("SystemManager", () => {
    it("initializes systems in order of insertion", () => {
        const manager = new SystemManager();
        const first = makeStubSystem();
        const second = makeStubSystem();
        manager.addSystem(first.system);
        manager.addSystem(second.system);
        expect(first.hooks.init).toHaveBeenCalledTimes(1);
        expect(second.hooks.init).toHaveBeenCalledTimes(1);
        expect(first.hooks.init.mock.invocationCallOrder[0]).toBeLessThan(second.hooks.init.mock.invocationCallOrder[0]);
    });
    it("supports indexed insertion", () => {
        const manager = new SystemManager();
        const first = makeStubSystem();
        const second = makeStubSystem();
        const firstId = manager.addSystem(first.system);
        const secondId = manager.addSystem(second.system, 0);
        expect(manager.getSystems().map((entry) => entry.id)).toEqual([
            secondId,
            firstId,
        ]);
    });
    it("supports explicit identifiers and rejects duplicates", () => {
        const manager = new SystemManager();
        const first = makeStubSystem();
        const second = makeStubSystem();
        manager.addSystem(first.system, { id: "alpha" });
        expect(manager.getSystems()[0].id).toBe("alpha");
        expect(() => manager.addSystem(second.system, { id: "alpha" })).toThrow("System with id 'alpha' is already registered");
    });
    it("removes systems and triggers onDestroy", () => {
        const manager = new SystemManager();
        const stub = makeStubSystem();
        const id = manager.addSystem(stub.system);
        manager.removeSystem(id);
        expect(stub.hooks.destroy).toHaveBeenCalledTimes(1);
        expect(manager.getSystems()).toHaveLength(0);
    });
    it("ignores duplicate removals", () => {
        const manager = new SystemManager();
        const stub = makeStubSystem();
        const id = manager.addSystem(stub.system);
        manager.removeSystem(id);
        expect(() => manager.removeSystem(id)).not.toThrow();
    });
    it("exposes list of active systems", () => {
        const manager = new SystemManager();
        const first = makeStubSystem();
        const second = makeStubSystem();
        const firstId = manager.addSystem(first.system);
        const secondId = manager.addSystem(second.system);
        expect(manager.getSystems()).toEqual([
            { id: firstId, instance: first.system },
            { id: secondId, instance: second.system },
        ]);
    });
    it("clears all systems", () => {
        const manager = new SystemManager();
        const first = makeStubSystem();
        const second = makeStubSystem();
        manager.addSystem(first.system);
        manager.addSystem(second.system);
        manager.clear();
        expect(first.hooks.destroy).toHaveBeenCalledTimes(1);
        expect(second.hooks.destroy).toHaveBeenCalledTimes(1);
        expect(manager.getSystems()).toHaveLength(0);
    });
});
