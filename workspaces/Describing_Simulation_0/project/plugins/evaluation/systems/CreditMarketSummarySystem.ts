import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { TIME_COMPONENT } from '../../../src/core/components/TimeComponent';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';

import {
  BANK_STATE_COMPONENT,
  CREDIT_MARKET_COMPONENT,
  MARKET_CONFIDENCE_COMPONENT,
  POLICY_RESPONSE_COMPONENT,
} from '../../simulation/components/CreditMarketComponents';
import {
  CREDIT_MARKET_SUMMARY_COMPONENT,
  type CreditMarketSummaryComponent,
} from '../components/CreditMarketSummaryComponent';

const SUMMARY_ENTITY_ID = 'credit-market-summary';
const TIME_ENTITY_ID = 'time';
const STRESS_THRESHOLD = 0.55;

const SECONDS_PER_DAY = 86_400;

/**
 * Derives descriptive metrics for the simulated scenario to support reporting.
 */
export class CreditMarketSummarySystem extends System {
  private observationCount = 0;
  private cumulativeSpread = 0;
  private cumulativeLendingGap = 0;
  private peakSpread = 0;
  private peakSpreadDay = 0;
  private peakStress = 0;
  private daysAboveThreshold = 0;
  private stabilizationDay: number | null = null;
  private stableRun = 0;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    if (!this.components.isRegistered(CREDIT_MARKET_SUMMARY_COMPONENT)) {
      this.components.register(CREDIT_MARKET_SUMMARY_COMPONENT);
    }

    if (!this.entities.has(SUMMARY_ENTITY_ID)) {
      this.entities.create(SUMMARY_ENTITY_ID);
    }
  }

  protected override update(deltaTime: number): void {
    if (
      !this.components.isRegistered(CREDIT_MARKET_COMPONENT) ||
      !this.components.isRegistered(MARKET_CONFIDENCE_COMPONENT) ||
      !this.components.isRegistered(POLICY_RESPONSE_COMPONENT) ||
      !this.components.isRegistered(BANK_STATE_COMPONENT)
    ) {
      return;
    }

    if (!this.entities.has(SUMMARY_ENTITY_ID)) {
      this.entities.create(SUMMARY_ENTITY_ID);
    }

    const market = this.components.getComponent('credit-market', CREDIT_MARKET_COMPONENT);
    const sentiment = this.components.getComponent('market-confidence', MARKET_CONFIDENCE_COMPONENT);
    const policy = this.components.getComponent('policy-response', POLICY_RESPONSE_COMPONENT);
    const bank = this.components.getComponent('top-3-bank', BANK_STATE_COMPONENT);

    if (!market || !sentiment || !policy || !bank) {
      return;
    }

    const time = this.components.getComponent(TIME_ENTITY_ID, TIME_COMPONENT);
    const day = time ? time.elapsed / SECONDS_PER_DAY : this.observationCount;

    this.observationCount += 1;
    this.cumulativeSpread += market.creditSpreadBps;
    this.cumulativeLendingGap += Math.max(0, 1 - market.lendingVolume);

    if (market.creditSpreadBps > this.peakSpread) {
      this.peakSpread = market.creditSpreadBps;
      this.peakSpreadDay = day;
    }

    if (market.stressLevel > this.peakStress) {
      this.peakStress = market.stressLevel;
    }

    if (market.stressLevel > STRESS_THRESHOLD) {
      this.daysAboveThreshold += 1;
      this.stableRun = 0;
    } else {
      this.stableRun += 1;
      if (this.stableRun >= 5 && this.stabilizationDay === null) {
        this.stabilizationDay = day;
      }
    }

    const averageSpread = this.cumulativeSpread / this.observationCount;

    const summary: CreditMarketSummaryComponent = {
      day,
      creditSpreadBps: market.creditSpreadBps,
      liquidityIndex: market.liquidityIndex,
      lendingVolume: market.lendingVolume,
      stressLevel: market.stressLevel,
      depositOutflowRatio: sentiment.depositOutflowRatio,
      riskAppetite: sentiment.riskAppetite,
      interbankTrust: sentiment.interbankTrust,
      policySupportLevel: policy.supportLevel,
      liquidityBackstop: policy.liquidityBackstop,
      capitalInjection: policy.capitalInjection,
      emergencyRateCutBps: policy.emergencyRateCutBps,
      metrics: {
        peakSpreadBps: this.peakSpread,
        peakSpreadDay: this.peakSpreadDay,
        peakStressLevel: this.peakStress,
        daysAboveStressThreshold: this.daysAboveThreshold,
        stabilizationDay: this.stabilizationDay,
        averageSpreadBps: averageSpread,
        cumulativeLendingGap: this.cumulativeLendingGap,
      },
    };

    this.components.setComponent(
      SUMMARY_ENTITY_ID,
      CREDIT_MARKET_SUMMARY_COMPONENT,
      summary,
    );
  }
}
