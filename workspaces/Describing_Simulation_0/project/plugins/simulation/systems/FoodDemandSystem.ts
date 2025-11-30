import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import { approach, clamp, exponentialSmoothing } from '../utils/math';
import { FOOD_MARKET_ENTITY_ID } from '../components/FoodSupplyComponent';
import {
  FOOD_DEMAND_COMPONENT,
  type FoodDemandComponent,
} from '../components/FoodDemandComponent';
import { FOOD_PRICE_COMPONENT, type FoodPriceComponent } from '../components/FoodPriceComponent';
import {
  WAR_ENTITY_ID,
  WAR_IMPACT_COMPONENT,
  type WarImpactComponent,
} from '../components/WarImpactComponent';

const SECONDS_PER_DAY = 86_400;

function ensureDemandComponent(
  entities: EntityManager,
  components: ComponentManager,
): { id: string; component: FoodDemandComponent } {
  if (!components.isRegistered(FOOD_DEMAND_COMPONENT)) {
    components.register(FOOD_DEMAND_COMPONENT);
  }

  const entity =
    entities.get(FOOD_MARKET_ENTITY_ID) ??
    entities.create(FOOD_MARKET_ENTITY_ID);
  const existing = components.getComponent(entity.id, FOOD_DEMAND_COMPONENT);

  if (existing) {
    return { id: entity.id, component: existing };
  }

  const initial: FoodDemandComponent = {
    baselineDemand: 100,
    currentDemand: 100,
    priceElasticity: 0.3,
    panicFactor: 0.1,
    rationingEffectiveness: 0,
    substitutionRate: 0.05,
    incomeShock: 0.05,
  };

  components.setComponent(entity.id, FOOD_DEMAND_COMPONENT, initial);
  return { id: entity.id, component: initial };
}

export class FoodDemandSystem extends System {
  private marketEntityId: string | null = null;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    const { id } = ensureDemandComponent(this.entities, this.components);
    this.marketEntityId = id;
  }

  protected override update(deltaTime: number): void {
    if (!this.marketEntityId) {
      throw new Error('Food demand entity not initialized.');
    }

    const demand =
      this.components.getComponent(this.marketEntityId, FOOD_DEMAND_COMPONENT) ??
      ensureDemandComponent(this.entities, this.components).component;
    const price = this.components.isRegistered(FOOD_PRICE_COMPONENT)
      ? this.components.getComponent(this.marketEntityId, FOOD_PRICE_COMPONENT)
      : undefined;
    const war = this.components.getComponent(WAR_ENTITY_ID, WAR_IMPACT_COMPONENT);

    if (!war) {
      return;
    }

    const next = this.calculateDemand(
      demand,
      price,
      war,
      deltaTime / SECONDS_PER_DAY,
    );

    this.components.setComponent(this.marketEntityId, FOOD_DEMAND_COMPONENT, next);
  }

  private calculateDemand(
    demand: FoodDemandComponent,
    price: FoodPriceComponent | undefined,
    war: WarImpactComponent,
    deltaDays: number,
  ): FoodDemandComponent {
    const panicTarget = clamp(
      0,
      0.6,
      Math.exp(-war.elapsedDays / 35) * 0.25 + war.intensity * 0.05,
    );
    const panicFactor = approach(demand.panicFactor, panicTarget, deltaDays * 0.6);

    const rationingEffectiveness = approach(
      demand.rationingEffectiveness,
      war.policyRationing,
      deltaDays * 0.6,
    );

    const substitutionTarget = clamp(
      0,
      0.5,
      war.reliefEffort * 0.5 + war.policyRationing * 0.3,
    );
    const substitutionRate = approach(
      demand.substitutionRate,
      substitutionTarget,
      deltaDays * 0.4,
    );

    const incomeShockTarget = clamp(
      0,
      0.6,
      war.intensity * 0.35 + war.blockadeSeverity * 0.25,
    );
    const incomeShock = approach(
      demand.incomeShock,
      incomeShockTarget,
      deltaDays * 0.3,
    );

    const priceSignal = price
      ? clamp(-0.5, 2, price.currentPrice / price.baselinePrice - 1)
      : 0;
    const priceResponse = -demand.priceElasticity * priceSignal;

    const demandPressure = war.demandPressure;

    const demandTarget = clamp(
      40,
      140,
      demand.baselineDemand *
        (1 + panicFactor + demandPressure - rationingEffectiveness - substitutionRate - incomeShock + priceResponse),
    );

    const currentDemand = exponentialSmoothing(
      demand.currentDemand,
      demandTarget,
      clamp(0, 1, deltaDays * 0.6),
    );

    return {
      ...demand,
      currentDemand,
      panicFactor,
      rationingEffectiveness,
      substitutionRate,
      incomeShock,
    };
  }
}
