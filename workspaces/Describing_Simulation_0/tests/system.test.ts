import { describe, expect, it, beforeEach } from "vitest";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { ComponentType } from "../src/core/components/ComponentType";
import { System } from "../src/core/systems/System";

class ProbeSystem extends System {
  initialize() {
    // access managers without throwing
    this.entities.list();
    this.components.getEntitiesWith(new ComponentType("probe"));
  }

  update() {
    // no-op for probe
  }
}

class PositionComponentType extends ComponentType<{ x: number }> {}

class PositionSystem extends System {
  constructor(
    entities: EntityManager,
    components: ComponentManager,
    private readonly position: PositionComponentType,
  ) {
    super(entities, components);
  }

  entity!: number;

  initialize() {
    this.entity = this.entities.create();
    this.components.set(this.entity, this.position, { x: 0 });
  }

  update() {
    const current = this.components.get(this.entity, this.position);
    if (!current) {
      throw new Error("Position component missing");
    }
    this.components.set(this.entity, this.position, { x: current.x + 1 });
  }

  destroy() {
    this.components.removeAll(this.entity);
    this.entities.remove(this.entity);
  }
}

describe("System", () => {
  let componentManager: ComponentManager;
  let entityManager: EntityManager;
  let positionType: PositionComponentType;

  beforeEach(() => {
    componentManager = new ComponentManager();
    entityManager = new EntityManager(componentManager);
    positionType = new PositionComponentType("position");
  });

  it("exposes managers to subclasses during construction", () => {
    const system = new ProbeSystem(entityManager, componentManager);

    expect(() => system.initialize()).not.toThrow();
    expect(() => system.destroy()).not.toThrow();
  });

  it("allows systems to manage components through lifecycle hooks", () => {
    const system = new PositionSystem(entityManager, componentManager, positionType);

    system.initialize();
    const entity = system.entity;

    expect(entityManager.has(entity)).toBe(true);
    expect(componentManager.get(entity, positionType)).toEqual({ x: 0 });

    system.update();
    system.update();

    expect(componentManager.get(entity, positionType)).toEqual({ x: 2 });

    system.destroy();

    expect(componentManager.get(entity, positionType)).toBeUndefined();
    expect(entityManager.has(entity)).toBe(false);
  });
});
