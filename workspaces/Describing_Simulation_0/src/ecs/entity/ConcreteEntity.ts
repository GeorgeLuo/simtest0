import { Entity, EntityId } from "./Entity";

/**
 * Default entity implementation that stores component data in-memory using a
 * simple map keyed by component type.
 */
export class ConcreteEntity extends Entity {
  private readonly components = new Map<string, unknown>();

  public constructor(id: EntityId, initialComponents?: Map<string, unknown>) {
    super(id);

    if (initialComponents !== undefined) {
      for (const [componentType, componentData] of initialComponents.entries()) {
        this.components.set(componentType, componentData);
      }
    }
  }

  public addComponent(componentType: string, componentData: unknown): void {
    this.components.set(componentType, componentData);
  }

  public removeComponent(componentType: string): void {
    this.components.delete(componentType);
  }

  public getComponent<T = unknown>(componentType: string): T | undefined {
    return this.components.get(componentType) as T | undefined;
  }

  public listComponents(): string[] {
    return Array.from(this.components.keys());
  }
}
