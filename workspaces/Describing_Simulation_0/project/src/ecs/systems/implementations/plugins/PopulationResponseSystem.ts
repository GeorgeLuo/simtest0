import type { ComponentManager } from '../../../components/ComponentManager.js';
import { foodResourceComponentType } from '../../../components/implementations/plugins/FoodResourceComponent.js';
import { populationComponentType } from '../../../components/implementations/plugins/PopulationComponent.js';
import type { System, SystemUpdateContext } from '../../System.js';

// Adjusts population counts based on food shortages while honoring minimum thresholds.
export class PopulationResponseSystem implements System {
  readonly id: string;

  private readonly componentManager: ComponentManager;

  constructor(componentManager: ComponentManager, id = 'population-response') {
    this.id = id;
    this.componentManager = componentManager;
  }

  update(context: SystemUpdateContext): void {
    const entityIds = this.componentManager.getEntitiesWith(populationComponentType);

    for (const entityId of entityIds) {
      const population = this.componentManager.getComponent(
        entityId,
        populationComponentType,
      );

      if (!population) {
        continue;
      }

      const food = this.componentManager.getComponent(entityId, foodResourceComponentType);

      if (!food) {
        continue;
      }

      const requiredFood = population.currentPopulation * population.perCapitaFoodNeed;

      if (requiredFood <= 0) {
        continue;
      }

      const shortage = Math.max(0, requiredFood - food.currentFood);

      if (shortage <= 0) {
        continue;
      }

      const shortageRatio = Math.min(1, shortage / requiredFood);
      const floor = Math.max(0, population.minimumPopulation);
      const nextPopulation = Math.max(
        floor,
        population.currentPopulation * (1 - population.starvationRate * shortageRatio),
      );

      if (nextPopulation === population.currentPopulation) {
        continue;
      }

      this.componentManager.updateComponent(entityId, populationComponentType, {
        currentPopulation: nextPopulation,
      });
    }
  }
}
