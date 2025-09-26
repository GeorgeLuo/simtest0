import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { System } from '../../../src/core/systems/System';

import {
  BANK_STATE_COMPONENT,
  MARKET_CONFIDENCE_COMPONENT,
  POLICY_RESPONSE_COMPONENT,
  type PolicyResponseComponent,
} from '../components/CreditMarketComponents';

const BANK_ENTITY_ID = 'top-3-bank';
const SENTIMENT_ENTITY_ID = 'market-confidence';
const POLICY_ENTITY_ID = 'policy-response';

const SECONDS_PER_DAY = 86_400;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Models the fiscal and monetary interventions that respond to market stress.
 */
export class PolicyResponseSystem extends System {
  constructor(private readonly components: ComponentManager) {
    super();
  }

  protected override update(deltaTime: number): void {
    const policy = this.components.getComponent(POLICY_ENTITY_ID, POLICY_RESPONSE_COMPONENT);
    const sentiment = this.components.getComponent(
      SENTIMENT_ENTITY_ID,
      MARKET_CONFIDENCE_COMPONENT,
    );
    const bank = this.components.getComponent(BANK_ENTITY_ID, BANK_STATE_COMPONENT);

    if (!policy || !sentiment || !bank) {
      return;
    }

    const dtDays = Math.max(deltaTime / SECONDS_PER_DAY, 0.01);
    const stressSignal = clamp(sentiment.depositOutflowRatio * 0.9 + (1 - sentiment.interbankTrust), 0, 1.2);
    const shockBias = bank.defaulted ? 0.35 : 0.05;

    const desiredSupport = clamp(shockBias + stressSignal * 0.55, 0, 1);
    const desiredLiquidityBackstop = clamp(shockBias * 0.8 + stressSignal * 0.7, 0, 1);
    const desiredCapital = clamp(bank.defaulted ? 0.45 + stressSignal * 0.4 : stressSignal * 0.2, 0, 1);
    const desiredRateCut = clamp(bank.defaulted ? 60 + stressSignal * 140 : stressSignal * 40, 0, 200);

    const supportLevel = this.moveTowards(
      policy.supportLevel,
      desiredSupport,
      dtDays,
      0.42,
      0,
      1,
    );
    const liquidityBackstop = this.moveTowards(
      policy.liquidityBackstop,
      desiredLiquidityBackstop,
      dtDays,
      0.5,
      0,
      1,
    );
    const capitalInjection = this.moveTowards(
      policy.capitalInjection,
      desiredCapital,
      dtDays,
      0.38,
      0,
      1,
    );
    const emergencyRateCutBps = this.moveTowards(
      policy.emergencyRateCutBps,
      desiredRateCut,
      dtDays,
      0.6,
      0,
      200,
    );

    const interventionActive = bank.defaulted || supportLevel > 0.08;

    const nextPolicy: PolicyResponseComponent = {
      supportLevel,
      liquidityBackstop,
      capitalInjection,
      emergencyRateCutBps,
      interventionActive,
    };

    this.components.setComponent(POLICY_ENTITY_ID, POLICY_RESPONSE_COMPONENT, nextPolicy);
  }

  private moveTowards(
    current: number,
    target: number,
    dtDays: number,
    intensity: number,
    min: number,
    max: number,
  ): number {
    const rate = clamp(intensity * dtDays + 0.05, 0.05, 1);
    return clamp(current + (target - current) * rate, min, max);
  }
}
