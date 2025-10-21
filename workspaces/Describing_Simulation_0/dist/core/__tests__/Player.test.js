import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { EntityManager } from "../entity/EntityManager.js";
import { Player } from "../Player.js";
import { System } from "../systems/System.js";
import { SystemManager } from "../systems/SystemManager.js";
class TestSystem extends System {
    onInitSpy = vi.fn();
    onDestroySpy = vi.fn();
    updateSpy = vi.fn();
    onInit() {
        this.onInitSpy();
    }
    update() {
        this.updateSpy();
    }
    onDestroy() {
        this.onDestroySpy();
    }
}
describe("Player", () => {
    let componentManager;
    let entityManager;
    let systemManager;
    let player;
    beforeEach(() => {
        componentManager = new ComponentManager();
        entityManager = new EntityManager(componentManager);
        systemManager = new SystemManager();
        player = new Player(entityManager, componentManager, systemManager);
    });
    it("evaluates systems sequentially when running", () => {
        const first = new TestSystem();
        const second = new TestSystem();
        systemManager.addSystem(first);
        systemManager.addSystem(second);
        const evaluateSpy = vi.spyOn(player, "step");
        player.start();
        player.step();
        expect(first.updateSpy).toHaveBeenCalledTimes(1);
        expect(second.updateSpy).toHaveBeenCalledTimes(1);
        player.stop();
        evaluateSpy.mockRestore();
    });
    it("does not double-start when already running", () => {
        const system = new TestSystem();
        systemManager.addSystem(system);
        player.start();
        player.start();
        player.step();
        expect(system.updateSpy).toHaveBeenCalledTimes(1);
        player.stop();
    });
    it("pauses further updates until restarted", () => {
        const system = new TestSystem();
        systemManager.addSystem(system);
        player.start();
        player.step();
        player.pause();
        player.step();
        expect(system.updateSpy).toHaveBeenCalledTimes(1);
        player.start();
        player.step();
        expect(system.updateSpy).toHaveBeenCalledTimes(2);
        player.stop();
    });
    it("stop clears the environment and returns to idle", () => {
        const system = new TestSystem();
        systemManager.addSystem(system);
        player.start();
        player.step();
        player.stop();
        expect(system.updateSpy).toHaveBeenCalledTimes(1);
        expect(system.onDestroySpy).toHaveBeenCalledTimes(1);
        expect(entityManager.getEntities()).toHaveLength(0);
    });
    it("stop while paused returns to idle", () => {
        const system = new TestSystem();
        systemManager.addSystem(system);
        player.start();
        player.pause();
        player.stop();
        expect(system.onDestroySpy).toHaveBeenCalledTimes(1);
        expect(entityManager.getEntities()).toHaveLength(0);
    });
});
