const components = require('../components/kuramotoWorld');

const DEFAULT_MODULUS = Math.PI * 2;

function unwrapPayload(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'payload')) {
    return value.payload;
  }
  return value;
}

function readComponent(componentManager, entity, componentDef, fallback = null) {
  const instance = componentManager.getComponent(entity, componentDef);
  const value = unwrapPayload(instance);
  return value == null ? fallback : value;
}

function readNumber(componentManager, entity, componentDef, fallback) {
  const value = readComponent(componentManager, entity, componentDef, fallback);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readInteger(componentManager, entity, componentDef, fallback) {
  const value = readComponent(componentManager, entity, componentDef, fallback);
  return Number.isInteger(value) ? value : fallback;
}

function wrapPhase(value, modulus) {
  if (!Number.isFinite(value) || !Number.isFinite(modulus) || modulus <= 0) {
    return value;
  }
  let wrapped = value % modulus;
  if (wrapped < 0) {
    wrapped += modulus;
  }
  return wrapped;
}

function getWorldEntity(componentManager) {
  const worlds = componentManager.getEntitiesWithComponent(components.oscillator_count);
  return worlds[0] ?? null;
}

function getSeriesEntity(entityManager, componentManager) {
  const existing = componentManager.getEntitiesWithComponent(components.series_tick);
  if (existing.length > 0) {
    return existing[0];
  }
  return entityManager.create();
}

function collectOscillators(componentManager) {
  const entities = componentManager.getEntitiesWithComponent(components.osc_id);
  const oscillators = [];

  for (const entity of entities) {
    const id = readInteger(componentManager, entity, components.osc_id, null);
    if (!Number.isInteger(id)) {
      continue;
    }
    const phase = readNumber(componentManager, entity, components.osc_phase, 0);
    const omega = readNumber(componentManager, entity, components.osc_natural_frequency, 0);
    const weightsRaw = readComponent(componentManager, entity, components.osc_coupling_weights, []);
    const weights = Array.isArray(weightsRaw)
      ? weightsRaw.map((value) => (Number.isFinite(value) ? value : 0))
      : [];

    oscillators.push({
      entity,
      id,
      phase,
      omega,
      weights,
    });
  }

  oscillators.sort((a, b) => a.id - b.id);
  return oscillators;
}

function computeOrderMetrics(phases, velocities) {
  const n = phases.length;
  if (n === 0) {
    return { r: 0, psi: 0, meanFrequency: 0 };
  }

  let sumSin = 0;
  let sumCos = 0;
  for (const phase of phases) {
    sumSin += Math.sin(phase);
    sumCos += Math.cos(phase);
  }
  const meanSin = sumSin / n;
  const meanCos = sumCos / n;
  const r = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
  const psi = Math.atan2(meanSin, meanCos);

  const meanFrequency = velocities.length
    ? velocities.reduce((sum, value) => sum + value, 0) / velocities.length
    : 0;

  return { r, psi, meanFrequency };
}

function updateSeries(componentManager, seriesEntity, nextTick, nextTime, phases, signals, order) {
  componentManager.addComponent(seriesEntity, components.series_tick, nextTick);
  componentManager.addComponent(seriesEntity, components.series_time_s, nextTime);
  componentManager.addComponent(seriesEntity, components.series_phase_by_oscillator, phases);
  componentManager.addComponent(seriesEntity, components.series_signal_by_oscillator, signals);
  componentManager.addComponent(seriesEntity, components.series_order_parameter_r, order.r);
  componentManager.addComponent(seriesEntity, components.series_order_parameter_psi, order.psi);
  componentManager.addComponent(seriesEntity, components.series_mean_frequency, order.meanFrequency);
}

function createSystem() {
  return {
    update(context) {
      const { entityManager, componentManager } = context;
      const world = getWorldEntity(componentManager);
      if (world == null) {
        return;
      }

      const totalTicks = readInteger(componentManager, world, components.total_ticks, 1200);
      const tick = readInteger(componentManager, world, components.sim_tick, 0);
      const dt = readNumber(componentManager, world, components.integration_dt_s, 0.05);
      const couplingScale = readNumber(componentManager, world, components.coupling_scale_k, 1.0);
      const modulus = readNumber(componentManager, world, components.phase_wrap_modulus, DEFAULT_MODULUS);
      const emissionStride = Math.max(
        1,
        readInteger(componentManager, world, components.emission_stride_ticks, 1),
      );

      if (tick >= totalTicks) {
        componentManager.addComponent(world, components.run_complete, true);
        return;
      }

      const oscillators = collectOscillators(componentManager);
      if (oscillators.length === 0) {
        return;
      }

      const n = oscillators.length;
      const currentPhases = oscillators.map((oscillator) => oscillator.phase);
      const velocities = new Array(n).fill(0);
      const nextPhases = new Array(n).fill(0);
      const currentTime = tick * dt;
      const dynamicCouplingScale = couplingScale * (1 + 0.35 * Math.sin(0.08 * currentTime));

      for (let i = 0; i < n; i += 1) {
        const osc = oscillators[i];
        let couplingSum = 0;
        for (let j = 0; j < n; j += 1) {
          if (i === j) {
            continue;
          }
          const weight = Number.isFinite(osc.weights[j]) ? osc.weights[j] : 0;
          couplingSum += weight * Math.sin(currentPhases[j] - currentPhases[i]);
        }
        // Gentle deterministic forcing keeps the ensemble near the sync threshold.
        const externalForcing = 0.16 * Math.sin(0.55 * currentTime + osc.id * 0.9);
        const velocity = osc.omega + (dynamicCouplingScale / n) * couplingSum + externalForcing;
        const nextPhase = wrapPhase(currentPhases[i] + dt * velocity, modulus);

        velocities[i] = velocity;
        nextPhases[i] = nextPhase;

        componentManager.addComponent(osc.entity, components.osc_phase_velocity, velocity);
        componentManager.addComponent(osc.entity, components.osc_phase, nextPhase);
        componentManager.addComponent(osc.entity, components.osc_signal_sin, Math.sin(nextPhase));
        componentManager.addComponent(osc.entity, components.osc_signal_cos, Math.cos(nextPhase));
      }

      const nextTick = tick + 1;
      const nextTime = nextTick * dt;
      const nextSignals = nextPhases.map((phase) => Math.sin(phase));
      const order = computeOrderMetrics(nextPhases, velocities);

      componentManager.addComponent(world, components.sim_tick, nextTick);
      componentManager.addComponent(world, components.sim_time_s, nextTime);
      componentManager.addComponent(world, components.run_complete, nextTick >= totalTicks);

      if (nextTick % emissionStride === 0) {
        const seriesEntity = getSeriesEntity(entityManager, componentManager);
        updateSeries(
          componentManager,
          seriesEntity,
          nextTick,
          nextTime,
          nextPhases.slice(),
          nextSignals,
          order,
        );
      }
    },
  };
}

module.exports = { createSystem };
