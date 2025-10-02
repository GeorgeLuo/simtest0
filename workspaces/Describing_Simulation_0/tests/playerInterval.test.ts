import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { Player } from "../src/core/player/Player";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import { IntervalLoop } from "../src/core/player/Loop";
import { TimeComponent } from "../src/core/components/time/TimeComponent";
import { TimeSystem } from "../src/core/systems/time/TimeSystem";

const createController = (intervalMs: number) => {
  let loop: IntervalLoop | null = null;
  return {
    start(callback: () => void) {
      loop = new IntervalLoop(callback, intervalMs);
    },
    stop() {
      loop?.stop();
      loop = null;
    },
    get isActive() {
      return loop !== null;
    },
  };
};

describe("Player with IntervalLoop", () => {
  let entities: EntityManager;
  let components: ComponentManager;
  let manager: SystemManager;
  let timeSystem: TimeSystem;
  let controller: ReturnType<typeof createController>;
  let player: Player;

  beforeEach(() => {
    vi.useFakeTimers();
    components = new ComponentManager();
    entities = new EntityManager(components);
    manager = new SystemManager();
    const timeComponent = new TimeComponent("time");
    timeSystem = new TimeSystem(entities, components, timeComponent);
    manager.add(timeSystem);

    controller = createController(10);
    player = new Player(entities, components, manager, controller);
  });

  afterEach(() => {
    player.stop();
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("advances time via real interval ticks", () => {
    player.start();
    expect(controller.isActive).toBe(true);

    vi.advanceTimersByTime(50);

    expect(timeSystem.tick).toBe(5);
  });

  it("halts ticks after pause and resumes on restart", () => {
    player.start();
    vi.advanceTimersByTime(30);
    expect(timeSystem.tick).toBe(3);

    player.pause();
    expect(controller.isActive).toBe(false);
    vi.advanceTimersByTime(30);
    expect(timeSystem.tick).toBe(3);

    player.start();
    vi.advanceTimersByTime(20);
    expect(timeSystem.tick).toBe(5);
  });

  it("clears interval and ecs state on stop", () => {
    player.start();
    vi.advanceTimersByTime(40);
    expect(timeSystem.tick).toBe(4);

    player.stop();
    expect(controller.isActive).toBe(false);
    expect([...entities.list()]).toHaveLength(0);
  });
});
