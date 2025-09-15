import {
  InMemoryComponentManager,
  PositionComponent,
  type PositionComponentState,
} from "./helpers/concreteImplementations";

describe("InMemoryComponentManager", () => {
  it("registers component types for lookup", () => {
    const manager = new InMemoryComponentManager();
    const position = new PositionComponent();

    manager.register(position);

    expect(manager.has(position.type)).toBe(true);
  });

  it("attaches component state to entities", () => {
    const manager = new InMemoryComponentManager();
    const position = new PositionComponent();
    const entityId = "entity-1";
    const initialState = position.create({ x: 5, y: -3 });

    manager.register(position);
    manager.attach(entityId, position.type, initialState);

    const stored = manager.read(entityId, position.type) as PositionComponentState;
    expect(stored).toEqual({ x: 5, y: -3 });
  });

  it("detaches component state and reclaims resources", () => {
    const manager = new InMemoryComponentManager();
    const position = new PositionComponent();
    const entityId = "entity-2";

    manager.register(position);
    manager.attach(entityId, position.type, position.create({ x: 1, y: 2 }));

    manager.detach(entityId, position.type);

    expect(manager.read(entityId, position.type)).toBeUndefined();
  });

  it("retrieves component state snapshots without mutation", () => {
    const manager = new InMemoryComponentManager();
    const position = new PositionComponent();
    const entityId = "entity-3";

    manager.register(position);
    manager.attach(entityId, position.type, position.create({ x: 7, y: 9 }));

    const snapshot = manager.read(entityId, position.type) as PositionComponentState;
    snapshot.x = 100;

    const subsequent = manager.read(entityId, position.type) as PositionComponentState;
    expect(subsequent).toEqual({ x: 7, y: 9 });
    expect(subsequent).not.toBe(snapshot);
  });
});
