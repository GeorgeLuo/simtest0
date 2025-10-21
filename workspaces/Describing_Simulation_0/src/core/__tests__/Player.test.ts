import { beforeEach, describe, expect, it, vi } from "vitest";
import { ComponentManager } from "../components/ComponentManager.js";
import { EntityManager } from "../entity/EntityManager.js";
import { Player } from "../Player.js";
import { System } from "../systems/System.js";
import { SystemManager } from "../systems/SystemManager.js";

class TestSystem extends System {
  readonly onInitSpy = vi.fn();
  readonly onDestroySpy = vi.fn();
  readonly updateSpy = vi.fn();

  onInit(): void {
    this.onInitSpy();
  }

  update(): void {
    this.updateSpy();
  }

  onDestroy(): void {
    this.onDestroySpy();
  }
}

describe("Player", () => {
  let componentManager: ComponentManager;
  let entityManager: EntityManager;
  let systemManager: SystemManager;
  let player: Player;

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

    const evaluateSpy = vi.spyOn(player as Player & { step: () => void }, "step");
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
