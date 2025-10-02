import { describe, expect, it, vi, beforeEach } from "vitest";
import { Player } from "../src/core/player/Player";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import type { System } from "../src/core/systems/System";
import { TimeComponent } from "../src/core/components/time/TimeComponent";
import { TimeSystem } from "../src/core/systems/time/TimeSystem";

class MockLoop {
  #tickFn: (() => void) | null = null;

  start(fn: () => void) {
    this.#tickFn = fn;
  }

  trigger(times = 1) {
    for (let i = 0; i < times; i += 1) {
      this.#tickFn?.();
    }
  }

  stop() {
    this.#tickFn = null;
  }
}

describe("Player", () => {
  let entities: EntityManager;
  let components: ComponentManager;
  let systemManager: SystemManager;
  let player: Player;
  let loop: MockLoop;
  let componentStore: ComponentManager;

  const createSystem = () => {
    const initialize = vi.fn();
    const update = vi.fn();
    const destroy = vi.fn();
    return {
      system: { initialize, update, destroy } as unknown as System,
      initialize,
      update,
      destroy,
    };
  };

  beforeEach(() => {
    componentStore = new ComponentManager();
    entities = new EntityManager(componentStore);
    components = componentStore;
    systemManager = new SystemManager();
    loop = new MockLoop();

    player = new Player(entities, components, systemManager, {
      start: (cb) => loop.start(cb),
      stop: () => loop.stop(),
    });
  });

  it("initializes system manager and starts loop", () => {
    const { system, update, initialize } = createSystem();
    systemManager.add(system);

    player.start();
    loop.trigger();

    expect(systemManager.list()).toContain(system);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("pauses without clearing systems", () => {
    const { system, update } = createSystem();
    systemManager.add(system);
    player.start();

    player.pause();
    loop.trigger();

    expect(update).not.toHaveBeenCalled();
    expect(systemManager.list()).toHaveLength(1);
  });

  it("stops and clears manager", () => {
    const { system, destroy } = createSystem();
    systemManager.add(system);
    player.start();

    player.stop();

    expect(systemManager.list()).toHaveLength(0);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("initializes systems added after start immediately", () => {
    const first = createSystem();
    const late = createSystem();
    systemManager.add(first.system);

    player.start();
    loop.trigger();

    systemManager.add(late.system);
    expect(late.initialize).toHaveBeenCalledTimes(1);

    loop.trigger(2);

    expect(first.update).toHaveBeenCalledTimes(3);
    expect(late.update).toHaveBeenCalledTimes(2);
  });

  it("resets running state allowing restart after stop", () => {
    const { system, update, initialize } = createSystem();
    systemManager.add(system);

    player.start();
    loop.trigger();
    player.stop();

    systemManager.add(system);
    player.start();
    loop.trigger();

    expect(initialize).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("clears entity and component state on stop", () => {
    const timeComponent = new TimeComponent("time");
    const timeSystem = new TimeSystem(entities, components, timeComponent);
    systemManager.add(timeSystem);

    player.start();
    loop.trigger(3);

    expect(timeSystem.tick).toBe(3);
    expect(components.getEntitiesWith(timeComponent).size).toBe(1);

    player.stop();

    expect([...entities.list()]).toHaveLength(0);
    expect(components.getEntitiesWith(timeComponent).size).toBe(0);

    const newTimeSystem = new TimeSystem(entities, components, timeComponent);
    systemManager.add(newTimeSystem);
    player.start();
    loop.trigger();

    expect(newTimeSystem.entity).toBe(0);
    expect(newTimeSystem.tick).toBe(1);
  });
});
