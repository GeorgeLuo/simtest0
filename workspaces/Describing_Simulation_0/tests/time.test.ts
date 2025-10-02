import { describe, expect, it, beforeEach } from "vitest";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { TimeComponent } from "../src/core/components/time/TimeComponent";
import { TimeSystem } from "../src/core/systems/time/TimeSystem";

describe("TimeSystem", () => {
  let components: ComponentManager;
  let entities: EntityManager;
  let timeComponent: TimeComponent;
  let system: TimeSystem;

  beforeEach(() => {
    components = new ComponentManager();
    entities = new EntityManager(components);
    timeComponent = new TimeComponent("time");
    system = new TimeSystem(entities, components, timeComponent);
  });

  it("creates a dedicated time entity with tick 0 on initialize", () => {
    system.initialize();

    const entity = system.entity;
    const state = components.get(entity, timeComponent);

    expect(state).toEqual({ tick: 0 });
  });

  it("increments tick on each update", () => {
    system.initialize();

    system.update();
    expect(system.tick).toBe(1);

    system.update();
    expect(system.tick).toBe(2);
  });

  it("does not create multiple time entities on repeated initialize calls", () => {
    system.initialize();
    const first = system.entity;

    system.initialize();
    const second = system.entity;

    expect(second).toBe(first);
    const timeEntities = components.getEntitiesWith(timeComponent);
    expect(timeEntities.size).toBe(1);
  });

  it("exposes the current tick and entity for other systems", () => {
    system.initialize();
    system.update();

    expect(system.tick).toBe(1);
    expect(entities.has(system.entity)).toBe(true);
  });

  it("cleans up the time entity on destroy", () => {
    system.initialize();
    const entity = system.entity;

    system.destroy();

    expect(entities.has(entity)).toBe(false);
    expect(components.get(entity, timeComponent)).toBeUndefined();
  });
});
