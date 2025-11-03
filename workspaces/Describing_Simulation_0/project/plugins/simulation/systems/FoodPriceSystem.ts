import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import { approach, clamp, exponentialSmoothing } from '../utils/math';
import {
  FOOD_MARKET_ENTITY_ID,
  FOOD_SUPPLY_COMPONENT,
  type FoodSupplyComponent,
} from '../components/FoodSupplyComponent';
import {
  FOOD_DEMAND_COMPONENT,
  type FoodDemandComponent,
} from '../components/FoodDemandComponent';
import {
  FOOD_PRICE_COMPONENT,
  type FoodPriceComponent,
} from '../components/FoodPriceComponent';
import {
  WAR_ENTITY_ID,
  WAR_IMPACT_COMPONENT,
  type WarImpactComponent,
} from '../components/WarImpactComponent';

const SECONDS_PER_DAY = 86_400;

function ensurePriceComponent(
  entities: EntityManager,
  components: ComponentManager,
): { id: string; component: FoodPriceComponent } {
  if (!components.isRegistered(FOOD_PRICE_COMPONENT)) {
    components.register(FOOD_PRICE_COMPONENT);
  }

  const entity =
    entities.get(FOOD_MARKET_ENTITY_ID) ??
    entities.create(FOOD_MARKET_ENTITY_ID);
  const existing = components.getComponent(entity.id, FOOD_PRICE_COMPONENT);

  if (existing) {
    return { id: entity.id, component: existing };
  }

  const initial: FoodPriceComponent = {
    baselinePrice: 100,
    currentPrice: 100,
    inflationRate: 0,
    volatility: 0.02,
    priceMomentum: 0,
    scarcityIndex: 0,
    affordabilityIndex: 1,
  };

  components.setComponent(entity.id, FOOD_PRICE_COMPONENT, initial);
  return { id: entity.id, component: initial };
}

export class FoodPriceSystem extends System {
  private marketEntityId: string | null = null;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    const { id } = ensurePriceComponent(this.entities, this.components);
    this.marketEntityId = id;
  }

  protected override update(deltaTime: number): void {
    if (!this.marketEntityId) {
      throw new Error('Food price entity not initialized.');
    }

    const supply = this.components.getComponent(
      this.marketEntityId,
      FOOD_SUPPLY_COMPONENT,
    );
    const demand = this.components.getComponent(
      this.marketEntityId,
      FOOD_DEMAND_COMPONENT,
    );
    const price =
      this.components.getComponent(this.marketEntityId, FOOD_PRICE_COMPONENT) ??
      ensurePriceComponent(this.entities, this.components).component;
    const war = this.components.getComponent(WAR_ENTITY_ID, WAR_IMPACT_COMPONENT);

    if (!supply || !demand || !war) {
      return;
    }

    const { priceState, supplyState } = this.calculatePrice(
      price,
      supply,
      demand,
      war,
      deltaTime / SECONDS_PER_DAY,
    );

    this.components.setComponent(this.marketEntityId, FOOD_PRICE_COMPONENT, priceState);
    this.components.setComponent(this.marketEntityId, FOOD_SUPPLY_COMPONENT, supplyState);
  }

  private calculatePrice(
    price: FoodPriceComponent,
    supply: FoodSupplyComponent,
    demand: FoodDemandComponent,
    war: WarImpactComponent,
    deltaDays: number,
  ): { priceState: FoodPriceComponent; supplyState: FoodSupplyComponent } {
    const effectiveSupply = supply.currentProduction * (1 - supply.wastageRate);
    const baselineDemand = demand.baselineDemand;
    const demandGap = demand.currentDemand - effectiveSupply;

    const stockpileBuffer = clamp(
      0,
      1.5,
      supply.stockpile / Math.max(1, supply.targetStockpile),
    );

    const scarcity = clamp(
      -1,
      1.5,
      demandGap / Math.max(1, baselineDemand) +
        war.supplyDisruption * 0.3 -
        stockpileBuffer * 0.4 +
        (1 - supply.logisticsEfficiency) * 0.2,
    );

    const inflationPressure =
      Math.max(0, scarcity) * (0.9 + war.intensity * 0.6 + war.blockadeSeverity * 0.4) +
      demand.panicFactor * 0.3 +
      war.demandPressure * 0.4;

    const deflationPressure =
      Math.max(0, -scarcity) * (0.6 + supply.logisticsEfficiency * 0.5) +
      war.reliefEffort * 0.6 +
      demand.rationingEffectiveness * 0.35 +
      stockpileBuffer * 0.5;

    const netPressure = clamp(
      -1.5,
      1.5,
      (inflationPressure - deflationPressure) * 0.6,
    );
    const momentumTarget = clamp(-0.2, 0.2, netPressure * 0.4);
    const priceMomentum = approach(
      price.priceMomentum,
      momentumTarget,
      clamp(0, 1, deltaDays * 0.7),
    );

    const priceChange = clamp(-0.4, 0.4, priceMomentum * deltaDays * 0.25);
    const nextPrice = clamp(20, 320, price.currentPrice * (1 + priceChange));
    const inflationRate = clamp(-0.3, 0.5, priceChange);

    const volatility = exponentialSmoothing(
      price.volatility,
      Math.abs(inflationRate),
      clamp(0, 1, deltaDays * 0.4),
    );

    const affordabilityIndex = clamp(
      0.2,
      1.6,
      (effectiveSupply + supply.stockpile * 0.05) /
        Math.max(1, demand.currentDemand) /
        (nextPrice / price.baselinePrice),
    );

    const stockpileDelta =
      (effectiveSupply - demand.currentDemand) * deltaDays;
    const nextStockpile = clamp(
      0,
      400,
      supply.stockpile + stockpileDelta,
    );

    const adjustedSupply: FoodSupplyComponent = {
      ...supply,
      stockpile: nextStockpile,
    };

    const priceState: FoodPriceComponent = {
      ...price,
      currentPrice: nextPrice,
      inflationRate,
      volatility,
      priceMomentum,
      scarcityIndex: scarcity,
      affordabilityIndex,
    };

    return { priceState, supplyState: adjustedSupply };
  }
}
