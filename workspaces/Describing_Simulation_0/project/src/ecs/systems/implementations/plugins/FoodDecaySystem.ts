import type { ComponentManager } from '../../../components/ComponentManager.js';
import {
  foodResourceComponentType,
  type FoodResourceComponent,
} from '../../../components/implementations/plugins/FoodResourceComponent.js';
import type { System, SystemUpdateContext } from '../../System.js';

// Reduces food reserves on every tick according to each entity's decay configuration.
export class FoodDecaySystem implements System {
  readonly id: string;

  private readonly componentManager: ComponentManager;

  constructor(componentManager: ComponentManager, id = 'food-decay') {
    this.id = id;
    this.componentManager = componentManager;
  }

  update(context: SystemUpdateContext): void {
    const entityIds = this.componentManager.getEntitiesWith(foodResourceComponentType);

    for (const entityId of entityIds) {
      const food = this.componentManager.getComponent(
        entityId,
        foodResourceComponentType,
      );

      if (!food) {
        continue;
      }

      const floor = Math.max(0, food.minimumFood);
      const decayAmount = this.calculateDecay(food, context.deltaTime);
      const nextFood = Math.max(floor, food.currentFood - decayAmount);

      if (nextFood === food.currentFood) {
        continue;
      }

      this.componentManager.updateComponent(entityId, foodResourceComponentType, {
        currentFood: nextFood,
      });
    }
  }

  private calculateDecay(food: FoodResourceComponent, deltaTime: number): number {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return 0;
    }

    return food.decayPerTick * deltaTime;
  }
}
