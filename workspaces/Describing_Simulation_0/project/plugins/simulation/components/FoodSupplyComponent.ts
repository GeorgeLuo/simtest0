import { ComponentType } from '../../../src/core/components/ComponentType';

export interface FoodSupplyComponent {
  /** Baseline daily production volume in index units. */
  baselineProduction: number;
  /** Current effective production after disruptions. */
  currentProduction: number;
  /** Share of production relying on imports 0 (self-sufficient) to 1 (fully import reliant). */
  importDependency: number;
  /** Capacity to adapt and recover supply shocks 0 to 1. */
  resilience: number;
  /** Available strategic reserves in daily production equivalents. */
  stockpile: number;
  /** Desired buffer of reserves to stabilize prices. */
  targetStockpile: number;
  /** Logistics efficiency 0 (paralyzed) to 1 (fully efficient). */
  logisticsEfficiency: number;
  /** Share of production lost to spoilage or wastage. */
  wastageRate: number;
}

export const FOOD_SUPPLY_COMPONENT = new ComponentType<FoodSupplyComponent>(
  'foodSupply',
);

export const FOOD_MARKET_ENTITY_ID = 'food-market';
