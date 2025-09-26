import { ComponentType } from '../../../src/core/components/ComponentType';

export interface WarImpactComponent {
  /** Intensity of the conflict scaled 0 (no conflict) to 1 (max intensity). */
  intensity: number;
  /** Aggregate supply disruption factor 0 (no disruption) to 1 (total loss). */
  supplyDisruption: number;
  /** Demand-side pressure where positive values indicate upward pressure. */
  demandPressure: number;
  /** Effectiveness of relief logistics counteracting disruptions. */
  reliefEffort: number;
  /** Severity of trade blockades restricting imports 0 to 1. */
  blockadeSeverity: number;
  /** Policy driven rationing dampening demand 0 to 1. */
  policyRationing: number;
  /** Accumulated infrastructure damage limiting supply resilience 0 to 1. */
  infrastructureDamage: number;
  /** Elapsed time in days since hostilities began. */
  elapsedDays: number;
}

export const WAR_IMPACT_COMPONENT = new ComponentType<WarImpactComponent>(
  'warImpact',
);

export const WAR_ENTITY_ID = 'war';
