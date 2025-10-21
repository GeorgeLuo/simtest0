import { describe, expect, it } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { ComponentType } from "../components/ComponentType.js";
import { EntityManager } from "../entity/EntityManager.js";
const makeManagers = () => {
    const componentManager = new ComponentManager();
    const entityManager = new EntityManager(componentManager);
    return { componentManager, entityManager };
};
describe("ComponentManager", () => {
    it("attaches a component instance per entity and type", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const type = new ComponentType("counter");
        componentManager.addComponent(entity, type, { value: 1 });
        expect(componentManager.getComponent(entity, type)).toEqual({ value: 1 });
    });
    it("replaces existing component when the same type is re-added", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const type = new ComponentType("counter");
        componentManager.addComponent(entity, type, { value: 1 });
        componentManager.addComponent(entity, type, { value: 2 });
        expect(componentManager.getComponent(entity, type)).toEqual({ value: 2 });
    });
    it("removes specific component by type", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const type = new ComponentType("counter");
        componentManager.addComponent(entity, type, { value: 1 });
        componentManager.removeComponent(entity, type);
        expect(componentManager.getComponent(entity, type)).toBeUndefined();
    });
    it("removes all components for an entity", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const counter = new ComponentType("counter");
        const flag = new ComponentType("flag");
        componentManager.addComponent(entity, counter, { value: 1 });
        componentManager.addComponent(entity, flag, { enabled: true });
        componentManager.removeAllComponents(entity);
        expect(componentManager.getComponents(entity)).toHaveLength(0);
    });
    it("retrieves component data for entity", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const type = new ComponentType("counter");
        componentManager.addComponent(entity, type, { value: 1 });
        expect(componentManager.getComponent(entity, type)).toEqual({ value: 1 });
    });
    it("lists all components for an entity", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const counter = new ComponentType("counter");
        const flag = new ComponentType("flag");
        componentManager.addComponent(entity, counter, { value: 1 });
        componentManager.addComponent(entity, flag, { enabled: true });
        expect(componentManager.getComponents(entity)).toEqual([
            { type: counter, data: { value: 1 } },
            { type: flag, data: { enabled: true } },
        ]);
    });
    it("iterates components without allocating intermediate arrays", () => {
        const { componentManager, entityManager } = makeManagers();
        const entity = entityManager.createEntity();
        const counter = new ComponentType("counter");
        const flag = new ComponentType("flag");
        componentManager.addComponent(entity, counter, { value: 1 });
        componentManager.addComponent(entity, flag, { enabled: true });
        const visited = [];
        componentManager.forEachComponent(entity, (component) => {
            visited.push(component);
        });
        expect(visited).toEqual(componentManager.getComponents(entity));
    });
    it("returns entities sharing a component type", () => {
        const { componentManager, entityManager } = makeManagers();
        const counter = new ComponentType("counter");
        const first = entityManager.createEntity();
        const second = entityManager.createEntity();
        const third = entityManager.createEntity();
        componentManager.addComponent(first, counter, { value: 1 });
        componentManager.addComponent(second, counter, { value: 2 });
        // third intentionally left without the component
        expect(componentManager.getEntitiesWithComponent(counter)).toEqual([
            first,
            second,
        ]);
    });
});
