import type { ComponentManager } from '../components/ComponentManager.js';
import type { ComponentType } from '../components/ComponentType.js';

export type EntityComponentAssociation = {
  type: ComponentType<unknown>;
  instance: unknown;
};

// Represents a unique object within the ECS world.
export class Entity {
  private static nextId = 1;

  readonly id: number;

  constructor(existingId?: number) {
    if (existingId !== undefined) {
      this.id = existingId;
      if (existingId >= Entity.nextId) {
        Entity.nextId = existingId + 1;
      }
      return;
    }

    this.id = Entity.nextId;
    Entity.nextId += 1;
  }

  enumerateComponents(componentManager: ComponentManager): EntityComponentAssociation[] {
    const components = componentManager.getComponents(this.id);
    const associations: EntityComponentAssociation[] = [];

    for (const [type, instance] of components.entries()) {
      associations.push({
        type,
        instance,
      });
    }

    return associations;
  }

  attachComponent<T>(
    componentManager: ComponentManager,
    type: ComponentType<T>,
    initial?: Partial<T>,
  ): T {
    return componentManager.attachComponent(this.id, type, initial);
  }

  getComponent<T>(componentManager: ComponentManager, type: ComponentType<T>): T | undefined {
    return componentManager.getComponent(this.id, type);
  }

  removeComponent<T>(componentManager: ComponentManager, type: ComponentType<T>): boolean {
    return componentManager.removeComponent(this.id, type);
  }

  removeAllComponents(componentManager: ComponentManager): void {
    componentManager.removeAllComponents(this.id);
  }
}
