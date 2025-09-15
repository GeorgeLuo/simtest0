import { BasicEntity } from "./helpers/concreteImplementations";

describe("BasicEntity", () => {
  it("allows components to be attached and retrieved by type", () => {
    const entity = new BasicEntity("entity-attach");
    const component = { hp: 100 };

    entity.addComponent("health", component);

    expect(entity.getComponent("health")).toBe(component);
  });

  it("exposes immutable identifiers once created", () => {
    const entity = new BasicEntity("entity-id");
    const originalId = entity.id;

    (entity as unknown as { id: string }).id = "mutated";

    expect(entity.id).toBe(originalId);
  });

  it("surfaces a list of component types for system iteration", () => {
    const entity = new BasicEntity("entity-components");

    entity.addComponent("position", { x: 1, y: 2 });
    entity.addComponent("velocity", { x: 0, y: 1 });

    const types = entity.listComponents();

    expect(types.sort()).toEqual(["position", "velocity"]);
  });

  it("supports removing a component and confirms its absence afterward", () => {
    const entity = new BasicEntity("entity-remove");

    entity.addComponent("inventory", ["torch"]);
    entity.removeComponent("inventory");

    expect(entity.getComponent("inventory")).toBeUndefined();
    expect(entity.listComponents()).not.toContain("inventory");
  });
});
