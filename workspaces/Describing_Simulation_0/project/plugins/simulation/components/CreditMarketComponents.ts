import { ComponentType } from '../../../src/core/components/ComponentType';

export interface BankStateComponent {
  /** Ratio of tangible equity to risk-weighted assets. */
  solvencyRatio: number;
  /** Share of high-quality liquid assets relative to stressed outflows. */
  liquidityCoverage: number;
  /** Total assets measured in arbitrary units. */
  assetBase: number;
  /** Total liabilities measured in arbitrary units. */
  liabilityBase: number;
  /** Flag indicating the bank has failed and is in resolution. */
  defaulted: boolean;
}

export interface CreditMarketStateComponent {
  /** Investment-grade credit spread measured in basis points. */
  creditSpreadBps: number;
  /** Relative intermediation liquidity on a 0-1 scale. */
  liquidityIndex: number;
  /** Aggregate lending volume normalised to the pre-shock baseline. */
  lendingVolume: number;
  /** Composite financial stress measure on a 0-1 scale. */
  stressLevel: number;
  /** Weighted average funding cost for issuers in percent. */
  fundingCost: number;
}

export interface MarketConfidenceComponent {
  /** Risk appetite of credit investors on a 0-1 scale. */
  riskAppetite: number;
  /** Share of deposits withdrawing each day on a 0-1 scale. */
  depositOutflowRatio: number;
  /** Strength of interbank trust on a 0-1 scale. */
  interbankTrust: number;
}

export interface PolicyResponseComponent {
  /** Aggregate strength of extraordinary support on a 0-1 scale. */
  supportLevel: number;
  /** Liquidity facilities deployed on a 0-1 scale. */
  liquidityBackstop: number;
  /** Size of capital backstops on a 0-1 scale. */
  capitalInjection: number;
  /** Policy rate cuts delivered in basis points. */
  emergencyRateCutBps: number;
  /** Whether authorities are actively intervening. */
  interventionActive: boolean;
}

export const BANK_STATE_COMPONENT = new ComponentType<BankStateComponent>('bank.state');
export const CREDIT_MARKET_COMPONENT = new ComponentType<CreditMarketStateComponent>(
  'credit.market',
);
export const MARKET_CONFIDENCE_COMPONENT = new ComponentType<MarketConfidenceComponent>(
  'market.confidence',
);
export const POLICY_RESPONSE_COMPONENT = new ComponentType<PolicyResponseComponent>(
  'policy.response',
);
