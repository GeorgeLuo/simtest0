import { describe, expect, it } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { TIME_COMPONENT } from "../components/TimeComponent.js";
import { EntityManager } from "../entity/EntityManager.js";
import { TimeSystem } from "../systems/TimeSystem.js";
describe("TimeSystem", () => {
    it("creates a time entity with tick 0 on initialization", () => {
        const componentManager = new ComponentManager();
        const entityManager = new EntityManager(componentManager);
        const system = new TimeSystem(entityManager, componentManager);
        system.onInit();
        const entities = componentManager.getEntitiesWithComponent(TIME_COMPONENT);
        expect(entities).toHaveLength(1);
        const entity = entities[0];
        expect(componentManager.getComponent(entity, TIME_COMPONENT)).toEqual({
            tick: 0,
        });
    });
    it("increments the tick on each update", () => {
        const componentManager = new ComponentManager();
        const entityManager = new EntityManager(componentManager);
        const system = new TimeSystem(entityManager, componentManager);
        system.onInit();
        system.update();
        system.update();
        const [entity] = componentManager.getEntitiesWithComponent(TIME_COMPONENT);
        expect(componentManager.getComponent(entity, TIME_COMPONENT)).toEqual({
            tick: 2,
        });
    });
    it("removes the time entity on destroy", () => {
        const componentManager = new ComponentManager();
        const entityManager = new EntityManager(componentManager);
        const system = new TimeSystem(entityManager, componentManager);
        system.onInit();
        const [entity] = componentManager.getEntitiesWithComponent(TIME_COMPONENT);
        system.onDestroy();
        expect(entityManager.hasEntity(entity)).toBe(false);
        expect(componentManager.getEntitiesWithComponent(TIME_COMPONENT)).toHaveLength(0);
    });
});
