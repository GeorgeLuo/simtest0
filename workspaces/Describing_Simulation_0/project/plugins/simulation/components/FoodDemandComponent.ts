import { ComponentType } from '../../../src/core/components/ComponentType';

export interface FoodDemandComponent {
  /** Baseline daily consumption requirement in index units. */
  baselineDemand: number;
  /** Effective demand after behavioral and policy adjustments. */
  currentDemand: number;
  /** Responsiveness of demand to price changes (absolute value). */
  priceElasticity: number;
  /** Panic-induced hoarding component 0 to 1. */
  panicFactor: number;
  /** Effectiveness of rationing programs reducing demand 0 to 1. */
  rationingEffectiveness: number;
  /** Substitution towards alternative calories 0 to 1. */
  substitutionRate: number;
  /** Aggregate income or access shock reducing demand 0 to 1. */
  incomeShock: number;
}

export const FOOD_DEMAND_COMPONENT = new ComponentType<FoodDemandComponent>(
  'foodDemand',
);
