import { describe, expect, it, beforeEach, vi } from "vitest";
import { EntityManager } from "../src/core/entity/EntityManager";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { ComponentType } from "../src/core/components/ComponentType";

describe("EntityManager", () => {
  let entityManager: EntityManager;
  let componentManager: ComponentManager;

  beforeEach(() => {
    componentManager = new ComponentManager();
    entityManager = new EntityManager(componentManager);
  });

  it("creates unique entity identifiers sequentially", () => {
    const first = entityManager.create();
    const second = entityManager.create();

    expect(first).toBeTypeOf("number");
    expect(second).toBeTypeOf("number");
    expect(second).not.toEqual(first);
  });

  it("tracks existing entities and reports membership", () => {
    const entity = entityManager.create();

    expect(entityManager.has(entity)).toBe(true);
    expect(entityManager.has(entity + 1)).toBe(false);
  });

  it("removes entities and triggers component cleanup", () => {
    const cleanup = vi.spyOn(componentManager, "removeAll");
    const entity = entityManager.create();

    entityManager.remove(entity);

    expect(entityManager.has(entity)).toBe(false);
    expect(cleanup).toHaveBeenCalledWith(entity);
  });

  it("lists entities as a read-only snapshot", () => {
    const entity = entityManager.create();
    const entities = entityManager.list();

    expect(entities.has(entity)).toBe(true);
    expect(() => {
      (entities as Set<number>).add(100);
    }).toThrow();
  });

  it("iterates entities without exposing mutable collection", () => {
    const first = entityManager.create();
    const second = entityManager.create();
    const visited: number[] = [];

    entityManager.forEach((entity) => {
      visited.push(entity);
      expect(() => {
        (entityManager.list() as Set<number>).clear();
      }).toThrow();
    });

    expect(visited).toEqual([first, second]);
  });

  it("clears entities and resets identifiers", () => {
    const markerType = new ComponentType<{ value: number }>("marker");
    const entity = entityManager.create();
    componentManager.set(entity, markerType, { value: 1 });

    entityManager.clear();

    expect([...entityManager.list()]).toHaveLength(0);
    expect(componentManager.get(entity, markerType)).toBeUndefined();

    const next = entityManager.create();
    expect(next).toBe(0);
  });
});

describe("ComponentManager", () => {
  let componentManager: ComponentManager;
  let entityManager: EntityManager;
  let positionType: ComponentType<{ x: number; y: number }>;
  let velocityType: ComponentType<{ vx: number; vy: number }>;

  beforeEach(() => {
    componentManager = new ComponentManager();
    entityManager = new EntityManager(componentManager);
    positionType = new ComponentType("position");
    velocityType = new ComponentType("velocity");
  });

  it("stores and retrieves single component per entity/type pair", () => {
    const entity = entityManager.create();
    componentManager.set(entity, positionType, { x: 1, y: 2 });
    componentManager.set(entity, positionType, { x: 3, y: 4 });

    expect(componentManager.get(entity, positionType)).toEqual({ x: 3, y: 4 });
  });

  it("retrieves all components for an entity", () => {
    const entity = entityManager.create();
    componentManager.set(entity, positionType, { x: 1, y: 1 });
    componentManager.set(entity, velocityType, { vx: 5, vy: -5 });

    const all = componentManager.getAll(entity);

    expect(all.get(positionType)).toEqual({ x: 1, y: 1 });
    expect(all.get(velocityType)).toEqual({ vx: 5, vy: -5 });
  });

  it("iterates components without allocating snapshots", () => {
    const entity = entityManager.create();
    componentManager.set(entity, positionType, { x: 1, y: 2 });
    componentManager.set(entity, velocityType, { vx: 3, vy: 4 });

    const seen: Array<{ id: string; value: unknown }> = [];
    componentManager.forEach(entity, (type, data) => {
      seen.push({ id: type.id, value: data });
    });

    expect(seen).toContainEqual({ id: positionType.id, value: { x: 1, y: 2 } });
    expect(seen).toContainEqual({ id: velocityType.id, value: { vx: 3, vy: 4 } });
  });

  it("lists entities possessing a specific component type", () => {
    const entityA = entityManager.create();
    const entityB = entityManager.create();
    const entityC = entityManager.create();

    componentManager.set(entityA, positionType, { x: 0, y: 0 });
    componentManager.set(entityB, positionType, { x: 1, y: 1 });
    componentManager.set(entityA, velocityType, { vx: 1, vy: 1 });

    const entities = componentManager.getEntitiesWith(positionType);

    expect(entities.has(entityA)).toBe(true);
    expect(entities.has(entityB)).toBe(true);
    expect(entities.has(entityC)).toBe(false);
  });

  it("removes specific component types", () => {
    const entity = entityManager.create();
    componentManager.set(entity, positionType, { x: 1, y: 1 });

    componentManager.remove(entity, positionType);

    expect(componentManager.get(entity, positionType)).toBeUndefined();
  });

  it("removes all components for an entity", () => {
    const entity = entityManager.create();
    componentManager.set(entity, positionType, { x: 1, y: 1 });
    componentManager.set(entity, velocityType, { vx: 1, vy: 1 });

    componentManager.removeAll(entity);

    expect(componentManager.getAll(entity).size).toBe(0);
  });

  it("clears all component state", () => {
    const entityA = entityManager.create();
    const entityB = entityManager.create();
    componentManager.set(entityA, positionType, { x: 1, y: 1 });
    componentManager.set(entityB, velocityType, { vx: 2, vy: 2 });

    componentManager.clearAll();

    expect(componentManager.getAll(entityA).size).toBe(0);
    expect(componentManager.getAll(entityB).size).toBe(0);
    expect(componentManager.getEntitiesWith(positionType).size).toBe(0);
    expect(componentManager.getEntitiesWith(velocityType).size).toBe(0);
  });
});
