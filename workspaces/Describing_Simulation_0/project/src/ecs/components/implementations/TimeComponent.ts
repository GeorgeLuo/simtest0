/**
 * Component plugins extend the ECS by defining new descriptors with `createComponentType` and
 * exporting them so hosts can register them through `ComponentManager.registerType` during
 * initialization. Once registered, systems can depend on the component just like built-in
 * descriptors declared in this directory.
 */
import { createComponentType } from '../ComponentType.js';

export type TimeComponent = {
  ticks: number;
  deltaPerUpdate: number;
};

export const timeComponentType = createComponentType<TimeComponent>({
  id: 'time',
  name: 'Time',
  description: 'Tracks the advancement of simulated time.',
  schema: {
    ticks: {
      description: 'Total elapsed ticks since the simulation began.',
      defaultValue: 0,
    },
    deltaPerUpdate: {
      description: 'How many ticks to advance on each update step.',
      defaultValue: 1,
    },
  },
});
