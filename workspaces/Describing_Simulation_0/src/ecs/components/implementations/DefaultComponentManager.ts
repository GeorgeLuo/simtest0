import { ComponentManager } from "../ComponentManager";
import { ComponentType, ComponentTypeId } from "../ComponentType";
import { EntityId } from "../../entity/Entity";

/**
 * Stores component instances per entity using nested maps.
 */
export class DefaultComponentManager extends ComponentManager {
  private readonly registry = new Map<ComponentTypeId, ComponentType>();

  private readonly components = new Map<EntityId, Map<ComponentTypeId, unknown>>();

  public register(componentType: ComponentType): void {
    if (this.registry.has(componentType.type)) {
      throw new Error(`Component type '${componentType.type}' is already registered.`);
    }

    this.registry.set(componentType.type, componentType);
  }

  public unregister(componentTypeId: ComponentTypeId): void {
    this.registry.delete(componentTypeId);

    for (const [entityId, componentMap] of this.components) {
      componentMap.delete(componentTypeId);

      if (componentMap.size === 0) {
        this.components.delete(entityId);
      }
    }
  }

  public has(componentTypeId: ComponentTypeId): boolean {
    return this.registry.has(componentTypeId);
  }

  public attach(entityId: EntityId, componentTypeId: ComponentTypeId, state: unknown): void {
    const componentType = this.registry.get(componentTypeId);

    if (!componentType) {
      throw new Error(`Component type '${componentTypeId}' is not registered.`);
    }

    const cloneArg = state as Parameters<typeof componentType.clone>[0];
    const componentState =
      state === undefined ? componentType.create() : componentType.clone(cloneArg);

    let componentsForEntity = this.components.get(entityId);

    if (!componentsForEntity) {
      componentsForEntity = new Map<ComponentTypeId, unknown>();
      this.components.set(entityId, componentsForEntity);
    }

    componentsForEntity.set(componentTypeId, componentState);
  }

  public detach(entityId: EntityId, componentTypeId: ComponentTypeId): void {
    if (!this.registry.has(componentTypeId)) {
      throw new Error(`Component type '${componentTypeId}' is not registered.`);
    }

    const componentsForEntity = this.components.get(entityId);

    if (!componentsForEntity) {
      return;
    }

    componentsForEntity.delete(componentTypeId);

    if (componentsForEntity.size === 0) {
      this.components.delete(entityId);
    }
  }

  public read(entityId: EntityId, componentTypeId: ComponentTypeId): unknown {
    const componentType = this.registry.get(componentTypeId);

    if (!componentType) {
      throw new Error(`Component type '${componentTypeId}' is not registered.`);
    }

    const componentsForEntity = this.components.get(entityId);

    if (!componentsForEntity) {
      return undefined;
    }

    const state = componentsForEntity.get(componentTypeId);

    if (state === undefined) {
      return undefined;
    }

    const cloneArg = state as Parameters<typeof componentType.clone>[0];
    return componentType.clone(cloneArg);
  }
}
