import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import { approach, clamp } from '../utils/math';
import {
  FOOD_MARKET_ENTITY_ID,
  FOOD_SUPPLY_COMPONENT,
  type FoodSupplyComponent,
} from '../components/FoodSupplyComponent';
import {
  WAR_ENTITY_ID,
  WAR_IMPACT_COMPONENT,
  type WarImpactComponent,
} from '../components/WarImpactComponent';

const SECONDS_PER_DAY = 86_400;

function ensureSupplyComponent(
  entities: EntityManager,
  components: ComponentManager,
): { id: string; component: FoodSupplyComponent } {
  if (!components.isRegistered(FOOD_SUPPLY_COMPONENT)) {
    components.register(FOOD_SUPPLY_COMPONENT);
  }

  const entity =
    entities.get(FOOD_MARKET_ENTITY_ID) ??
    entities.create(FOOD_MARKET_ENTITY_ID);
  const existing = components.getComponent(entity.id, FOOD_SUPPLY_COMPONENT);

  if (existing) {
    return { id: entity.id, component: existing };
  }

  const initial: FoodSupplyComponent = {
    baselineProduction: 100,
    currentProduction: 100,
    importDependency: 0.4,
    resilience: 0.55,
    stockpile: 220,
    targetStockpile: 250,
    logisticsEfficiency: 0.92,
    wastageRate: 0.05,
  };

  components.setComponent(entity.id, FOOD_SUPPLY_COMPONENT, initial);
  return { id: entity.id, component: initial };
}

export class FoodSupplySystem extends System {
  private marketEntityId: string | null = null;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    const { id } = ensureSupplyComponent(this.entities, this.components);
    this.marketEntityId = id;
  }

  protected override update(deltaTime: number): void {
    if (!this.marketEntityId) {
      throw new Error('Food market entity not initialized.');
    }

    const supply =
      this.components.getComponent(this.marketEntityId, FOOD_SUPPLY_COMPONENT) ??
      ensureSupplyComponent(this.entities, this.components).component;
    const war = this.components.getComponent(WAR_ENTITY_ID, WAR_IMPACT_COMPONENT);

    if (!war) {
      return;
    }

    const updated = this.calculateSupply(supply, war, deltaTime / SECONDS_PER_DAY);
    this.components.setComponent(this.marketEntityId, FOOD_SUPPLY_COMPONENT, updated);
  }

  private calculateSupply(
    supply: FoodSupplyComponent,
    war: WarImpactComponent,
    deltaDays: number,
  ): FoodSupplyComponent {
    const disruptionImpact =
      war.supplyDisruption * (1 - supply.resilience) +
      war.blockadeSeverity * supply.importDependency;
    const reliefBoost = war.reliefEffort * (0.3 + 0.4 * (1 - supply.importDependency));

    const logisticsTarget = clamp(
      0.25,
      1,
      1 - disruptionImpact * 0.6 - war.infrastructureDamage * 0.4 + reliefBoost * 0.5,
    );
    const logisticsEfficiency = approach(
      supply.logisticsEfficiency,
      logisticsTarget,
      deltaDays * 0.6,
    );

    const productionTarget =
      supply.baselineProduction *
        (0.65 + 0.35 * logisticsEfficiency) *
        (1 - war.supplyDisruption * (1 - supply.resilience * 0.6)) +
      supply.baselineProduction * reliefBoost * 0.4;

    const currentProduction = approach(
      supply.currentProduction,
      productionTarget,
      deltaDays * 0.5,
    );

    const wastageTarget = clamp(
      0.02,
      0.2,
      0.03 + (1 - logisticsEfficiency) * 0.1 + war.infrastructureDamage * 0.05,
    );
    const wastageRate = approach(supply.wastageRate, wastageTarget, deltaDays * 0.5);

    const targetStockpile = clamp(
      80,
      320,
      supply.targetStockpile * (1 - war.supplyDisruption * 0.25) +
        supply.baselineProduction * (0.5 + reliefBoost * 0.8),
    );

    return {
      ...supply,
      currentProduction,
      logisticsEfficiency,
      wastageRate,
      targetStockpile,
    };
  }
}
