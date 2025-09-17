/**
 * Component plugins extend the ECS by defining new descriptors with `createComponentType` and
 * exporting them so hosts can register them through `ComponentManager.registerType` during
 * initialization. Once registered, systems can depend on the component just like built-in
 * descriptors declared in this plugin directory.
 */
import { createComponentType } from '../../ComponentType.js';

export type FoodResourceComponent = {
  currentFood: number;
  decayPerTick: number;
  minimumFood: number;
};

export const foodResourceComponentType = createComponentType<FoodResourceComponent>({
  id: 'food-resource',
  name: 'FoodResource',
  description: 'Tracks the available food supply for an entity and how it changes over time.',
  schema: {
    currentFood: {
      description: 'Current amount of food stored for the entity.',
      defaultValue: 0,
    },
    decayPerTick: {
      description: 'Amount of food lost to decay or consumption each simulation tick.',
      defaultValue: 0,
    },
    minimumFood: {
      description: 'Lower bound applied when reducing food to prevent negative quantities.',
      defaultValue: 0,
    },
  },
});
