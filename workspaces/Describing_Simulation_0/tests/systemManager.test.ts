import { describe, expect, it, vi, beforeEach } from "vitest";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import type { System } from "../src/core/systems/System";

type TestSystem = {
  system: System;
  initialize: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const createSystem = (): TestSystem => {
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

describe("SystemManager", () => {
  let manager: SystemManager;
  let systemA: TestSystem;
  let systemB: TestSystem;
  let systemC: TestSystem;

  beforeEach(() => {
    manager = new SystemManager();
    systemA = createSystem();
    systemB = createSystem();
    systemC = createSystem();
  });

  it("adds systems preserving insertion order by default", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);

    expect(manager.list()).toEqual([systemA.system, systemB.system]);
  });

  it("allows inserting systems at specific indexes", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);
    manager.add(systemC.system, 1);

    expect(manager.list()).toEqual([systemA.system, systemC.system, systemB.system]);
  });

  it("calls initialize exactly once when start is invoked", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);

    manager.start();
    manager.start();

    expect(systemA.initialize).toHaveBeenCalledTimes(1);
    expect(systemB.initialize).toHaveBeenCalledTimes(1);
  });

  it("ticks systems in order after start", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);

    manager.start();
    manager.tick();

    const orderA = systemA.update.mock.invocationCallOrder[0];
    const orderB = systemB.update.mock.invocationCallOrder[0];
    expect(orderA).toBeLessThan(orderB);
    manager.tick();
    expect(systemA.update).toHaveBeenCalledTimes(2);
    expect(systemB.update).toHaveBeenCalledTimes(2);
  });

  it("skips updates for removed systems", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);

    manager.start();
    manager.remove(systemA.system);
    manager.tick();

    expect(systemA.update).not.toHaveBeenCalled();
    expect(systemA.destroy).toHaveBeenCalledTimes(1);
    expect(systemB.update).toHaveBeenCalledTimes(1);
  });

  it("destroys all systems on clear", () => {
    manager.add(systemA.system);
    manager.add(systemB.system);
    manager.start();

    manager.clear();

    expect(systemA.destroy).toHaveBeenCalledTimes(1);
    expect(systemB.destroy).toHaveBeenCalledTimes(1);
    expect(manager.list()).toHaveLength(0);
  });
});
