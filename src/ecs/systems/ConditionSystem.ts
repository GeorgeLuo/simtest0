import { System } from '../ECS';

export type ConditionFn = () => boolean;

export class ConditionSystem implements System {
  constructor(private condition: ConditionFn) {}

  update(): void {
    if (this.condition()) {
      throw new Error('Simulation end condition met');
    }
  }
}

export default ConditionSystem;
