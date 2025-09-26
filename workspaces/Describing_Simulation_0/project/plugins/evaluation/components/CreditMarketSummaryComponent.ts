import { ComponentType } from '../../../src/core/components/ComponentType';

export interface CreditMarketSummaryMetrics {
  peakSpreadBps: number;
  peakSpreadDay: number;
  peakStressLevel: number;
  daysAboveStressThreshold: number;
  stabilizationDay: number | null;
  averageSpreadBps: number;
  cumulativeLendingGap: number;
}

export interface CreditMarketSummaryComponent {
  day: number;
  creditSpreadBps: number;
  liquidityIndex: number;
  lendingVolume: number;
  stressLevel: number;
  depositOutflowRatio: number;
  riskAppetite: number;
  interbankTrust: number;
  policySupportLevel: number;
  liquidityBackstop: number;
  capitalInjection: number;
  emergencyRateCutBps: number;
  metrics: CreditMarketSummaryMetrics;
}

export const CREDIT_MARKET_SUMMARY_COMPONENT = new ComponentType<CreditMarketSummaryComponent>(
  'evaluation.credit.summary',
);
