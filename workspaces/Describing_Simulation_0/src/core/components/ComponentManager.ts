import { ComponentType } from './ComponentType';
import { EntityId } from '../entity/Entity';

/**
 * Minimal component store keyed by entity identifier and component type.
 */
export class ComponentManager {
  private readonly components = new Map<EntityId, Map<ComponentType, unknown>>();

  setComponent<T>(entityId: EntityId, type: ComponentType, value: T): void {
    let entityComponents = this.components.get(entityId);
    if (!entityComponents) {
      entityComponents = new Map<ComponentType, unknown>();
      this.components.set(entityId, entityComponents);
    }

    entityComponents.set(type, value);
  }

  getComponent<T>(entityId: EntityId, type: ComponentType): T | undefined {
    const entityComponents = this.components.get(entityId);
    return entityComponents?.get(type) as T | undefined;
  }

  removeComponent(entityId: EntityId, type: ComponentType): void {
    const entityComponents = this.components.get(entityId);
    entityComponents?.delete(type);
  }

  clear(): void {
    this.components.clear();
  }
}
