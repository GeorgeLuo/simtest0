import { ComponentType } from '../../../src/core/components/ComponentType';

/** Static personal attributes that shape how a villager reacts to the rumor. */
export interface VillagerProfileComponent {
  /** Display name used for reporting. */
  readonly name: string;
  /** Exposure threshold required before the villager starts spreading the rumor. */
  readonly susceptibility: number;
  /** Influence applied to neighbors on every sharing attempt. */
  readonly expressiveness: number;
  /** Number of ticks the villager remains an active spreader before becoming a stifler. */
  readonly patience: number;
}

/** Component type holding {@link VillagerProfileComponent} data. */
export const VILLAGER_PROFILE = new ComponentType<VillagerProfileComponent>(
  'village/profile',
);

/** Describes local relationships that determine who receives rumor attempts. */
export interface SocialNetworkComponent {
  /** Ordered list of neighbor entity identifiers. */
  readonly neighbors: string[];
}

/** Component type storing {@link SocialNetworkComponent} data. */
export const SOCIAL_NETWORK = new ComponentType<SocialNetworkComponent>(
  'village/social-network',
);

export type RumorStatus = 'ignorant' | 'spreader' | 'stifler';

/** Tracks the dynamic rumor state for each villager. */
export interface RumorStateComponent {
  /** Current stage in the rumor lifecycle. */
  readonly status: RumorStatus;
  /** Cumulative exposure from neighboring spreaders. */
  readonly exposure: number;
  /** Tick when the villager first heard the rumor, if ever. */
  readonly heardTick: number | null;
  /** Number of ticks spent as an active spreader. */
  readonly activeTicks: number;
}

/** Component type for {@link RumorStateComponent}. */
export const RUMOR_STATE = new ComponentType<RumorStateComponent>(
  'village/rumor-state',
);

export interface RumorMetricsEntry {
  readonly tick: number;
  readonly ignorant: number;
  readonly spreaders: number;
  readonly stiflers: number;
  readonly newlyInformed: number;
}

/** Aggregated counts for tracing rumor progression through the village. */
export interface RumorMetricsComponent {
  readonly history: RumorMetricsEntry[];
  readonly completed: boolean;
  readonly completionTick: number | null;
}

/** Component type for {@link RumorMetricsComponent}. */
export const RUMOR_METRICS = new ComponentType<RumorMetricsComponent>(
  'village/rumor-metrics',
);
