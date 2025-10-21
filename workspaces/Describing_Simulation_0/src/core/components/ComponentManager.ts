import { Entity } from "../entity/Entity.js";
import { ComponentType } from "./ComponentType.js";

export interface ComponentInstance<TPayload> {
  readonly type: ComponentType<TPayload>;
  readonly data: TPayload;
}

type EntityComponentMap = Map<
  ComponentType<unknown>,
  ComponentInstance<unknown>
>;

export class ComponentManager {
  private readonly componentsByEntity = new Map<Entity, EntityComponentMap>();
  private readonly entitiesByComponentType = new Map<
    ComponentType<unknown>,
    Set<Entity>
  >();

  addComponent<TPayload>(
    entity: Entity,
    type: ComponentType<TPayload>,
    data: TPayload,
  ): void {
    const componentsForEntity =
      this.componentsByEntity.get(entity) ?? new Map<ComponentType<unknown>, ComponentInstance<unknown>>();

    componentsForEntity.set(type, { type, data });
    this.componentsByEntity.set(entity, componentsForEntity);

    const entitiesWithType =
      this.entitiesByComponentType.get(type) ?? new Set<Entity>();
    entitiesWithType.add(entity);
    this.entitiesByComponentType.set(type, entitiesWithType);
  }

  removeComponent<TPayload>(
    entity: Entity,
    type: ComponentType<TPayload>,
  ): void {
    const componentsForEntity = this.componentsByEntity.get(entity);
    if (!componentsForEntity) {
      return;
    }

    const removed = componentsForEntity.delete(type);
    if (!removed) {
      return;
    }

    if (componentsForEntity.size === 0) {
      this.componentsByEntity.delete(entity);
    } else {
      this.componentsByEntity.set(entity, componentsForEntity);
    }

    const entitiesWithType = this.entitiesByComponentType.get(type);
    if (!entitiesWithType) {
      return;
    }

    entitiesWithType.delete(entity);
    if (entitiesWithType.size === 0) {
      this.entitiesByComponentType.delete(type);
    } else {
      this.entitiesByComponentType.set(type, entitiesWithType);
    }
  }

  removeAllComponents(entity: Entity): void {
    const componentsForEntity = this.componentsByEntity.get(entity);
    if (!componentsForEntity) {
      return;
    }

    for (const component of componentsForEntity.values()) {
      const entitiesWithType = this.entitiesByComponentType.get(component.type);
      if (!entitiesWithType) {
        continue;
      }

      entitiesWithType.delete(entity);
      if (entitiesWithType.size === 0) {
        this.entitiesByComponentType.delete(component.type);
      }
    }

    this.componentsByEntity.delete(entity);
  }

  getComponent<TPayload>(
    entity: Entity,
    type: ComponentType<TPayload>,
  ): TPayload | undefined {
    const componentsForEntity = this.componentsByEntity.get(entity);
    if (!componentsForEntity) {
      return undefined;
    }

    const instance = componentsForEntity.get(type) as
      | ComponentInstance<TPayload>
      | undefined;
    return instance?.data;
  }

  getComponents(entity: Entity): Array<ComponentInstance<unknown>> {
    const componentsForEntity = this.componentsByEntity.get(entity);
    if (!componentsForEntity) {
      return [];
    }

    return Array.from(componentsForEntity.values());
  }

  forEachComponent(
    entity: Entity,
    iteratee: (component: ComponentInstance<unknown>) => void,
  ): void {
    const componentsForEntity = this.componentsByEntity.get(entity);
    if (!componentsForEntity) {
      return;
    }

    for (const component of componentsForEntity.values()) {
      iteratee(component);
    }
  }

  getEntitiesWithComponent<TPayload>(
    type: ComponentType<TPayload>,
  ): Entity[] {
    const entitiesWithType = this.entitiesByComponentType.get(type);
    if (!entitiesWithType) {
      return [];
    }

    return Array.from(entitiesWithType);
  }
}
