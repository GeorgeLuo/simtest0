/**
 * Component plugins extend the ECS by defining new descriptors with `createComponentType` and
 * exporting them so hosts can register them through `ComponentManager.registerType` during
 * initialization. Once registered, systems can depend on the component just like built-in
 * descriptors declared in this plugin directory.
 */
import { createComponentType } from '../../ComponentType.js';

export type PopulationComponent = {
  currentPopulation: number;
  perCapitaFoodNeed: number;
  starvationRate: number;
  minimumPopulation: number;
};

export const populationComponentType = createComponentType<PopulationComponent>({
  id: 'population',
  name: 'Population',
  description: 'Models the size of a population and how it responds to available resources.',
  schema: {
    currentPopulation: {
      description: 'Number of individuals represented by the entity.',
      defaultValue: 0,
    },
    perCapitaFoodNeed: {
      description: 'Food required per individual each tick to avoid shortages.',
      defaultValue: 0,
    },
    starvationRate: {
      description:
        'Proportion of the population lost per tick when food falls short of per-capita requirements.',
      defaultValue: 0,
    },
    minimumPopulation: {
      description: 'Lower bound applied when reducing the population size.',
      defaultValue: 0,
    },
  },
});
