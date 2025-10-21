import { describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { EntityManager } from "../entity/EntityManager.js";
const createComponentManager = () => {
    const componentManager = new ComponentManager();
    return componentManager;
};
describe("EntityManager", () => {
    it("generates unique entity identifiers", () => {
        const manager = new EntityManager(createComponentManager());
        const first = manager.createEntity();
        const second = manager.createEntity();
        expect(first).not.toEqual(second);
    });
    it("tracks existence after creation", () => {
        const manager = new EntityManager(createComponentManager());
        const entity = manager.createEntity();
        expect(manager.hasEntity(entity)).toBe(true);
    });
    it("delegates component cleanup on removal", () => {
        const componentManager = createComponentManager();
        const removeAllSpy = vi.spyOn(componentManager, "removeAllComponents");
        const manager = new EntityManager(componentManager);
        const entity = manager.createEntity();
        manager.removeEntity(entity);
        expect(removeAllSpy).toHaveBeenCalledWith(entity);
    });
    it("ignores duplicate removals gracefully", () => {
        const manager = new EntityManager(createComponentManager());
        const entity = manager.createEntity();
        manager.removeEntity(entity);
        expect(() => manager.removeEntity(entity)).not.toThrow();
    });
    it("lists active entities", () => {
        const manager = new EntityManager(createComponentManager());
        const entities = [manager.createEntity(), manager.createEntity()];
        expect(manager.getEntities()).toEqual(entities);
    });
    it("iterates entities without requiring array materialization", () => {
        const manager = new EntityManager(createComponentManager());
        const entities = [manager.createEntity(), manager.createEntity()];
        const visited = [];
        manager.forEachEntity((entity) => {
            visited.push(entity);
        });
        expect(visited).toEqual(entities);
    });
});
