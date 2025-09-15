import { ComponentType, ComponentTypeId } from "./ComponentType";
import { EntityId } from "../entity/Entity";

/**
 * Manages registration and lifecycle of component instances across entities.
 */
export abstract class ComponentManager {
  public abstract register(componentType: ComponentType): void;

  public abstract unregister(componentTypeId: ComponentTypeId): void;

  public abstract has(componentTypeId: ComponentTypeId): boolean;

  public abstract attach(entityId: EntityId, componentTypeId: ComponentTypeId, state: unknown): void;

  public abstract detach(entityId: EntityId, componentTypeId: ComponentTypeId): void;

  public abstract read(entityId: EntityId, componentTypeId: ComponentTypeId): unknown;
}
