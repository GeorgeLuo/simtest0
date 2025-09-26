import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';

import {
  BANK_STATE_COMPONENT,
  CREDIT_MARKET_COMPONENT,
  MARKET_CONFIDENCE_COMPONENT,
  POLICY_RESPONSE_COMPONENT,
  type BankStateComponent,
  type CreditMarketStateComponent,
  type MarketConfidenceComponent,
  type PolicyResponseComponent,
} from '../components/CreditMarketComponents';

const BANK_ENTITY_ID = 'top-3-bank';
const MARKET_ENTITY_ID = 'credit-market';
const SENTIMENT_ENTITY_ID = 'market-confidence';
const POLICY_ENTITY_ID = 'policy-response';

/**
 * Materialises the core entities and baseline state required for the simulation.
 */
export class EnvironmentSetupSystem extends System {
  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    this.ensureComponentRegistration();
    this.createOrUpdateEntities();
  }

  protected override update(): void {
    // The setup work is idempotent and complete during initialisation.
  }

  private ensureComponentRegistration(): void {
    const types = [
      BANK_STATE_COMPONENT,
      CREDIT_MARKET_COMPONENT,
      MARKET_CONFIDENCE_COMPONENT,
      POLICY_RESPONSE_COMPONENT,
    ];

    for (const type of types) {
      if (!this.components.isRegistered(type)) {
        this.components.register(type);
      }
    }
  }

  private createOrUpdateEntities(): void {
    this.ensureBankState();
    this.ensureMarketState();
    this.ensureSentimentState();
    this.ensurePolicyState();
  }

  private ensureBankState(): void {
    if (!this.entities.has(BANK_ENTITY_ID)) {
      this.entities.create(BANK_ENTITY_ID);
    }

    const initialBankState: BankStateComponent = {
      solvencyRatio: 0.115,
      liquidityCoverage: 0.82,
      assetBase: 1_250,
      liabilityBase: 1_140,
      defaulted: false,
    };

    this.components.setComponent(
      BANK_ENTITY_ID,
      BANK_STATE_COMPONENT,
      initialBankState,
    );
  }

  private ensureMarketState(): void {
    if (!this.entities.has(MARKET_ENTITY_ID)) {
      this.entities.create(MARKET_ENTITY_ID);
    }

    const initialMarket: CreditMarketStateComponent = {
      creditSpreadBps: 150,
      liquidityIndex: 0.72,
      lendingVolume: 1.0,
      stressLevel: 0.24,
      fundingCost: 3.1,
    };

    this.components.setComponent(
      MARKET_ENTITY_ID,
      CREDIT_MARKET_COMPONENT,
      initialMarket,
    );
  }

  private ensureSentimentState(): void {
    if (!this.entities.has(SENTIMENT_ENTITY_ID)) {
      this.entities.create(SENTIMENT_ENTITY_ID);
    }

    const initialSentiment: MarketConfidenceComponent = {
      riskAppetite: 0.66,
      depositOutflowRatio: 0.02,
      interbankTrust: 0.78,
    };

    this.components.setComponent(
      SENTIMENT_ENTITY_ID,
      MARKET_CONFIDENCE_COMPONENT,
      initialSentiment,
    );
  }

  private ensurePolicyState(): void {
    if (!this.entities.has(POLICY_ENTITY_ID)) {
      this.entities.create(POLICY_ENTITY_ID);
    }

    const initialPolicy: PolicyResponseComponent = {
      supportLevel: 0,
      liquidityBackstop: 0.05,
      capitalInjection: 0,
      emergencyRateCutBps: 0,
      interventionActive: false,
    };

    this.components.setComponent(
      POLICY_ENTITY_ID,
      POLICY_RESPONSE_COMPONENT,
      initialPolicy,
    );
  }
}
