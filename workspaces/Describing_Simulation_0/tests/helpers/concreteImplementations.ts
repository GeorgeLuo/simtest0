import type { ComponentState } from "../../src/ecs/components/ComponentType";
import { ComponentManager } from "../../src/ecs/components/ComponentManager";
import { ComponentType, ComponentTypeId } from "../../src/ecs/components/ComponentType";
import type { EntityId } from "../../src/ecs/entity/Entity";
import { Entity } from "../../src/ecs/entity/Entity";
import { System } from "../../src/ecs/systems/System";
import { SystemManager } from "../../src/ecs/systems/SystemManager";
import { TimeComponentState } from "../../src/ecs/components/implementations/TimeComponent";
import { TimeSystem } from "../../src/ecs/systems/implementations/TimeSystem";

/**
 * Minimal in-memory component manager used to exercise the abstract
 * scaffolding behaviors in tests.
 */
export class InMemoryComponentManager extends ComponentManager {
  private readonly registry = new Map<ComponentTypeId, ComponentType<ComponentState>>();

  private readonly componentsByEntity = new Map<
    EntityId,
    Map<ComponentTypeId, ComponentState>
  >();

  public register(componentType: ComponentType): void {
    this.registry.set(componentType.type, componentType as ComponentType<ComponentState>);
  }

  public unregister(componentTypeId: ComponentTypeId): void {
    this.registry.delete(componentTypeId);
    for (const [entityId, components] of this.componentsByEntity.entries()) {
      components.delete(componentTypeId);
      if (components.size === 0) {
        this.componentsByEntity.delete(entityId);
      }
    }
  }

  public has(componentTypeId: ComponentTypeId): boolean {
    return this.registry.has(componentTypeId);
  }

  public attach(
    entityId: EntityId,
    componentTypeId: ComponentTypeId,
    state: unknown,
  ): void {
    const componentType = this.registry.get(componentTypeId);
    if (!componentType) {
      throw new Error(`Component type ${componentTypeId} is not registered.`);
    }

    const entityComponents = this.componentsByEntity.get(entityId) ??
      new Map<ComponentTypeId, ComponentState>();

    const createdState = componentType.create(state as Partial<ComponentState>);
    const storedState = componentType.clone(createdState as ComponentState);

    entityComponents.set(componentTypeId, storedState);
    this.componentsByEntity.set(entityId, entityComponents);
  }

  public detach(entityId: EntityId, componentTypeId: ComponentTypeId): void {
    const entityComponents = this.componentsByEntity.get(entityId);
    if (!entityComponents) {
      return;
    }

    entityComponents.delete(componentTypeId);
    if (entityComponents.size === 0) {
      this.componentsByEntity.delete(entityId);
    }
  }

  public read(entityId: EntityId, componentTypeId: ComponentTypeId): unknown {
    const entityComponents = this.componentsByEntity.get(entityId);
    if (!entityComponents) {
      return undefined;
    }

    const state = entityComponents.get(componentTypeId);
    const componentType = this.registry.get(componentTypeId);

    if (!state || !componentType) {
      return undefined;
    }

    return componentType.clone(state as ComponentState);
  }
}

export interface PositionComponentState extends ComponentState {
  x: number;
  y: number;
}

export class PositionComponent extends ComponentType<PositionComponentState> {
  public constructor() {
    super("position");
  }

  public create(initialState?: Partial<PositionComponentState>): PositionComponentState {
    return {
      x: initialState?.x ?? 0,
      y: initialState?.y ?? 0,
    };
  }

  public clone(state: PositionComponentState): PositionComponentState {
    return { ...state };
  }
}

/**
 * Simple entity implementation that stores component state in a local map.
 */
export class BasicEntity extends Entity {
  private readonly components = new Map<string, unknown>();

  public constructor(id: EntityId) {
    super(id);
    Object.defineProperty(this, "id", { value: id, writable: false, configurable: false });
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

/**
 * Deterministic system manager that preserves registration order.
 */
export class OrderedSystemManager extends SystemManager {
  private readonly systems = new Map<string, System>();

  private readonly order: string[] = [];

  public register(system: System): void {
    if (this.systems.has(system.id)) {
      return;
    }

    this.systems.set(system.id, system);
    this.order.push(system.id);
  }

  public unregister(systemId: string): void {
    if (!this.systems.delete(systemId)) {
      return;
    }

    const index = this.order.indexOf(systemId);
    if (index >= 0) {
      this.order.splice(index, 1);
    }
  }

  public get(systemId: string): System | undefined {
    return this.systems.get(systemId);
  }

  public getExecutionOrder(): Iterable<System> {
    return this.order
      .map((id) => this.systems.get(id))
      .filter((system): system is System => Boolean(system));
  }

  public initializeSystems(): void {
    for (const system of this.getExecutionOrder()) {
      system.initialize();
    }
  }

  public run(deltaTime: number): void {
    for (const system of this.getExecutionOrder()) {
      system.update(deltaTime);
    }
  }

  public shutdownSystems(): void {
    for (const system of [...this.getExecutionOrder()].reverse()) {
      system.shutdown();
    }
  }
}

export class BasicTimeSystem extends TimeSystem {
  public readonly id = "time";

  private state: TimeComponentState = { tick: 0, delta: 0 };

  public initialize(): void {
    this.state = { tick: 0, delta: 0 };
  }

  public update(deltaTime: number): void {
    this.step(deltaTime);
  }

  public shutdown(): void {
    // no-op for the in-memory implementation
  }

  public getState(): TimeComponentState {
    return { ...this.state };
  }

  public step(elapsed: number): void {
    this.state = {
      tick: this.state.tick + 1,
      delta: elapsed,
    };
  }
}
