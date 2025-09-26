import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { System } from '../../../src/core/systems/System';

import {
  BANK_STATE_COMPONENT,
  CREDIT_MARKET_COMPONENT,
  MARKET_CONFIDENCE_COMPONENT,
  type BankStateComponent,
  type CreditMarketStateComponent,
  type MarketConfidenceComponent,
} from '../components/CreditMarketComponents';

const BANK_ENTITY_ID = 'top-3-bank';
const MARKET_ENTITY_ID = 'credit-market';
const SENTIMENT_ENTITY_ID = 'market-confidence';

/**
 * Applies the initial failure shock to the environment when the simulation begins.
 */
export class BankCollapseSystem extends System {
  private shockApplied = false;

  constructor(private readonly components: ComponentManager) {
    super();
  }

  protected override update(): void {
    if (this.shockApplied) {
      return;
    }

    const bank = this.components.getComponent(BANK_ENTITY_ID, BANK_STATE_COMPONENT);
    const market = this.components.getComponent(MARKET_ENTITY_ID, CREDIT_MARKET_COMPONENT);
    const sentiment = this.components.getComponent(
      SENTIMENT_ENTITY_ID,
      MARKET_CONFIDENCE_COMPONENT,
    );

    if (!bank || !market || !sentiment) {
      return;
    }

    const shockedBank: BankStateComponent = {
      ...bank,
      solvencyRatio: Math.max(-0.04, bank.solvencyRatio - 0.18),
      liquidityCoverage: Math.max(0.08, bank.liquidityCoverage - 0.6),
      assetBase: bank.assetBase * 0.64,
      liabilityBase: bank.liabilityBase,
      defaulted: true,
    };

    const shockedMarket: CreditMarketStateComponent = {
      ...market,
      creditSpreadBps: Math.max(market.creditSpreadBps, 420),
      liquidityIndex: Math.max(0.22, market.liquidityIndex - 0.38),
      lendingVolume: Math.max(0.52, market.lendingVolume - 0.42),
      stressLevel: Math.min(0.92, Math.max(market.stressLevel, 0.86)),
      fundingCost: 1.5 + Math.max(market.creditSpreadBps, 420) / 100,
    };

    const shockedSentiment: MarketConfidenceComponent = {
      ...sentiment,
      riskAppetite: Math.max(0.22, sentiment.riskAppetite - 0.44),
      depositOutflowRatio: Math.min(0.38, sentiment.depositOutflowRatio + 0.3),
      interbankTrust: Math.max(0.26, sentiment.interbankTrust - 0.4),
    };

    this.components.setComponent(BANK_ENTITY_ID, BANK_STATE_COMPONENT, shockedBank);
    this.components.setComponent(MARKET_ENTITY_ID, CREDIT_MARKET_COMPONENT, shockedMarket);
    this.components.setComponent(
      SENTIMENT_ENTITY_ID,
      MARKET_CONFIDENCE_COMPONENT,
      shockedSentiment,
    );

    this.shockApplied = true;
  }
}
