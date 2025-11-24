import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { TIME_COMPONENT } from '../../../src/core/components/TimeComponent';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { System } from '../../../src/core/systems/System';
import { approach, clamp } from '../utils/math';
import {
  WAR_ENTITY_ID,
  WAR_IMPACT_COMPONENT,
  type WarImpactComponent,
} from '../components/WarImpactComponent';

const SECONDS_PER_DAY = 86_400;

function ensureWarComponent(
  entities: EntityManager,
  components: ComponentManager,
): { id: string; state: WarImpactComponent } {
  if (!components.isRegistered(WAR_IMPACT_COMPONENT)) {
    components.register(WAR_IMPACT_COMPONENT);
  }

  const entity = entities.get(WAR_ENTITY_ID) ?? entities.create(WAR_ENTITY_ID);
  const existing = components.getComponent(entity.id, WAR_IMPACT_COMPONENT);

  if (existing) {
    return { id: entity.id, state: existing };
  }

  const initial: WarImpactComponent = {
    intensity: 0.15,
    supplyDisruption: 0.1,
    demandPressure: 0.05,
    reliefEffort: 0.05,
    blockadeSeverity: 0.1,
    policyRationing: 0.0,
    infrastructureDamage: 0.05,
    elapsedDays: 0,
  };

  components.setComponent(entity.id, WAR_IMPACT_COMPONENT, initial);
  return { id: entity.id, state: initial };
}

export class WarImpactSystem extends System {
  private warEntityId: string | null = null;

  constructor(
    private readonly entities: EntityManager,
    private readonly components: ComponentManager,
  ) {
    super();
  }

  protected override onInit(): void {
    const { id } = ensureWarComponent(this.entities, this.components);
    this.warEntityId = id;
  }

  protected override update(deltaTime: number): void {
    if (!this.warEntityId) {
      throw new Error('War entity not initialized.');
    }

    const current =
      this.components.getComponent(this.warEntityId, WAR_IMPACT_COMPONENT) ??
      ensureWarComponent(this.entities, this.components).state;

    const deltaDays = deltaTime / SECONDS_PER_DAY;
    const timeState = this.components.getComponent('time', TIME_COMPONENT);
    const elapsedDays = timeState?.elapsed ? timeState.elapsed / SECONDS_PER_DAY : current.elapsedDays + deltaDays;

    const intensityTarget = clamp(
      0,
      1,
      0.2 + 0.7 * (1 - Math.exp(-elapsedDays / 40)) - 0.2 * Math.max(0, (elapsedDays - 180) / 180),
    );
    const intensity = approach(current.intensity, intensityTarget, deltaDays * 0.6);

    const blockadeTarget = clamp(
      0,
      1,
      0.15 + 0.7 * (1 - Math.exp(-elapsedDays / 35)) - 0.2 * Math.max(0, elapsedDays - 200) / 200,
    );
    const blockadeSeverity = approach(
      current.blockadeSeverity,
      blockadeTarget,
      deltaDays * 0.5,
    );

    const reliefTarget = clamp(
      0,
      0.7,
      (elapsedDays < 50 ? elapsedDays / 50 : 1) * 0.2 + Math.max(0, elapsedDays - 60) / 300,
    );
    const reliefEffort = approach(current.reliefEffort, reliefTarget, deltaDays * 0.4);

    const infrastructureDamage = clamp(
      0,
      1,
      current.infrastructureDamage + intensity * deltaDays * 0.02 - reliefEffort * deltaDays * 0.01,
    );

    const supplyDisruptionBase = clamp(
      0,
      1,
      0.15 + intensity * 0.55 + blockadeSeverity * 0.35 + infrastructureDamage * 0.3 - reliefEffort * 0.45,
    );

    const rationingTarget = clamp(
      0,
      0.6,
      supplyDisruptionBase * 0.6 + Math.max(0, elapsedDays - 30) / 250,
    );
    const policyRationing = approach(
      current.policyRationing,
      rationingTarget,
      deltaDays * 0.7,
    );

    const panicPulse = Math.exp(-elapsedDays / 35) * 0.25;
    const demandPressure = clamp(
      -0.4,
      0.4,
      panicPulse + intensity * 0.08 + blockadeSeverity * 0.05 - policyRationing * 0.5 - reliefEffort * 0.25,
    );

    const nextState: WarImpactComponent = {
      intensity,
      supplyDisruption: supplyDisruptionBase,
      demandPressure,
      reliefEffort,
      blockadeSeverity,
      policyRationing,
      infrastructureDamage,
      elapsedDays,
    };

    this.components.setComponent(this.warEntityId, WAR_IMPACT_COMPONENT, nextState);
  }
}
