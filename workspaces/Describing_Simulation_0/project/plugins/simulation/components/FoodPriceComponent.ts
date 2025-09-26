import { ComponentType } from '../../../src/core/components/ComponentType';

export interface FoodPriceComponent {
  /** Baseline consumer price index for staple foods. */
  baselinePrice: number;
  /** Current simulated price level. */
  currentPrice: number;
  /** Short-run inflation rate per day. */
  inflationRate: number;
  /** Rolling volatility indicator capturing price swings. */
  volatility: number;
  /** Momentum term capturing the persistence of price pressure. */
  priceMomentum: number;
  /** Scarcity index derived from supply-demand gaps. */
  scarcityIndex: number;
  /** Affordability index comparing availability to price growth. */
  affordabilityIndex: number;
}

export const FOOD_PRICE_COMPONENT = new ComponentType<FoodPriceComponent>(
  'foodPrice',
);
