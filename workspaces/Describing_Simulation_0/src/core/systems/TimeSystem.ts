import { ComponentManager } from "../components/ComponentManager.js";
import { TIME_COMPONENT, TimeComponentState } from "../components/TimeComponent.js";
import { Entity } from "../entity/Entity.js";
import { EntityManager } from "../entity/EntityManager.js";
import { System } from "./System.js";

export class TimeSystem extends System {
  private timeEntity: Entity | null = null;

  constructor(
    private readonly entityManager: EntityManager,
    private readonly componentManager: ComponentManager,
  ) {
    super();
  }

  onInit(): void {
    if (this.timeEntity !== null) {
      return;
    }

    const entity = this.entityManager.createEntity();
    this.componentManager.addComponent(entity, TIME_COMPONENT, { tick: 0 });
    this.timeEntity = entity;
  }

  update(): void {
    if (this.timeEntity === null) {
      return;
    }

    const current =
      this.componentManager.getComponent(this.timeEntity, TIME_COMPONENT);
    const nextTick = (current?.tick ?? 0) + 1;
    this.componentManager.addComponent(this.timeEntity, TIME_COMPONENT, {
      tick: nextTick,
    });
  }

  onDestroy(): void {
    if (this.timeEntity === null) {
      return;
    }

    this.componentManager.removeAllComponents(this.timeEntity);
    this.entityManager.removeEntity(this.timeEntity);
    this.timeEntity = null;
  }
}
