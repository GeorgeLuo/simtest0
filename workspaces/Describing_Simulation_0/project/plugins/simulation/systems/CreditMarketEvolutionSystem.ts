import { ComponentManager } from '../../../src/core/components/ComponentManager';
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

const SECONDS_PER_DAY = 86_400;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Propagates confidence shocks through credit pricing, liquidity, and lending dynamics.
 */
export class CreditMarketEvolutionSystem extends System {
  constructor(private readonly components: ComponentManager) {
    super();
  }

  protected override update(deltaTime: number): void {
    const bank = this.components.getComponent(BANK_ENTITY_ID, BANK_STATE_COMPONENT);
    const market = this.components.getComponent(MARKET_ENTITY_ID, CREDIT_MARKET_COMPONENT);
    const sentiment = this.components.getComponent(
      SENTIMENT_ENTITY_ID,
      MARKET_CONFIDENCE_COMPONENT,
    );
    const policy = this.components.getComponent(POLICY_ENTITY_ID, POLICY_RESPONSE_COMPONENT);

    if (!bank || !market || !sentiment || !policy) {
      return;
    }

    const dtDays = Math.max(deltaTime / SECONDS_PER_DAY, 0.01);
    const supportEffect =
      policy.supportLevel * 0.7 + policy.liquidityBackstop * 0.5 + policy.capitalInjection * 0.35;
    const rateRelief = policy.emergencyRateCutBps / 200;

    const desiredStress = this.computeStressTarget(bank, sentiment, supportEffect, rateRelief);
    const stress = this.easeTowards(market.stressLevel, desiredStress, dtDays, 0.38, 0.05, 0.95);

    const nextSpread = this.computeSpread(market, sentiment, supportEffect, rateRelief, stress, dtDays);
    const nextLiquidity = this.computeLiquidity(market, sentiment, supportEffect, rateRelief, stress, dtDays);
    const nextVolume = this.computeLendingVolume(
      market,
      sentiment,
      supportEffect,
      rateRelief,
      stress,
      dtDays,
    );

    const nextRisk = this.computeRiskAppetite(sentiment, supportEffect, stress, dtDays);
    const nextOutflow = this.computeDepositOutflow(bank, sentiment, supportEffect, stress, dtDays);
    const nextTrust = this.computeInterbankTrust(sentiment, supportEffect, stress, dtDays);

    const nextFundingCost = 1.5 + nextSpread / 100;

    const nextMarket: CreditMarketStateComponent = {
      creditSpreadBps: nextSpread,
      liquidityIndex: nextLiquidity,
      lendingVolume: nextVolume,
      stressLevel: stress,
      fundingCost: nextFundingCost,
    };

    const nextSentiment: MarketConfidenceComponent = {
      riskAppetite: nextRisk,
      depositOutflowRatio: nextOutflow,
      interbankTrust: nextTrust,
    };

    this.components.setComponent(MARKET_ENTITY_ID, CREDIT_MARKET_COMPONENT, nextMarket);
    this.components.setComponent(SENTIMENT_ENTITY_ID, MARKET_CONFIDENCE_COMPONENT, nextSentiment);
  }

  private computeStressTarget(
    bank: BankStateComponent,
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    rateRelief: number,
  ): number {
    const solvencyShock = bank.defaulted ? 0.55 : 0.15;
    const trustDrag = clamp(0.6 - sentiment.interbankTrust, 0, 0.5);
    const outflowDrag = clamp(sentiment.depositOutflowRatio * 0.7, 0, 0.6);
    const supportRelief = supportEffect * 0.6 + rateRelief * 0.25;

    return clamp(solvencyShock + trustDrag + outflowDrag - supportRelief, 0.08, 0.92);
  }

  private computeSpread(
    market: CreditMarketStateComponent,
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    rateRelief: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseSpread = 150;
    const stressPremium = stress * 260;
    const fundingPressure = sentiment.depositOutflowRatio * 380;
    const policyOffset = supportEffect * 220 + rateRelief * 140;

    const target = Math.max(baseSpread, baseSpread + stressPremium + fundingPressure - policyOffset);
    return this.easeTowards(market.creditSpreadBps, target, dtDays, 0.46, 120, 600);
  }

  private computeLiquidity(
    market: CreditMarketStateComponent,
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    rateRelief: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseLiquidity = 0.72;
    const stressDrag = stress * 0.45;
    const outflowDrag = sentiment.depositOutflowRatio * 0.55;
    const supportBoost = supportEffect * 0.55 + rateRelief * 0.2;

    const target = clamp(baseLiquidity - stressDrag - outflowDrag + supportBoost, 0.08, 1);
    return this.easeTowards(market.liquidityIndex, target, dtDays, 0.52, 0.08, 1);
  }

  private computeLendingVolume(
    market: CreditMarketStateComponent,
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    rateRelief: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseVolume = 1;
    const stressDrag = stress * 0.65;
    const riskPenalty = clamp(0.6 - sentiment.riskAppetite, 0, 0.6);
    const supportBoost = supportEffect * 0.62 + rateRelief * 0.25;

    const target = clamp(baseVolume - stressDrag - riskPenalty + supportBoost, 0.25, 1.1);
    return this.easeTowards(market.lendingVolume, target, dtDays, 0.4, 0.25, 1.1);
  }

  private computeRiskAppetite(
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseline = 0.66;
    const stressPenalty = stress * 0.5;
    const policyRelief = supportEffect * 0.35;

    const target = clamp(baseline - stressPenalty + policyRelief, 0.18, 0.74);
    return this.easeTowards(sentiment.riskAppetite, target, dtDays, 0.44, 0.18, 0.74);
  }

  private computeDepositOutflow(
    bank: BankStateComponent,
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseline = 0.02;
    const shockOutflow = bank.defaulted ? 0.32 : 0.05;
    const stressBias = stress * 0.35;
    const policyRelief = supportEffect * 0.26;

    const target = clamp(baseline + (shockOutflow - baseline) * (0.6 + stressBias) - policyRelief, baseline, 0.45);
    return this.easeTowards(sentiment.depositOutflowRatio, target, dtDays, 0.5, baseline, 0.45);
  }

  private computeInterbankTrust(
    sentiment: MarketConfidenceComponent,
    supportEffect: number,
    stress: number,
    dtDays: number,
  ): number {
    const baseline = 0.78;
    const stressPenalty = stress * 0.45;
    const supportBoost = supportEffect * 0.4;

    const target = clamp(baseline - stressPenalty + supportBoost, 0.25, 0.88);
    return this.easeTowards(sentiment.interbankTrust, target, dtDays, 0.42, 0.25, 0.88);
  }

  private easeTowards(
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
