const components = require('../components/kuramotoWorld');

const DEFAULTS = {
  oscillatorCount: 12,
  dt: 0.05,
  totalTicks: 20000,
  couplingScale: 0.95,
  topology: 'modular_ring',
  phaseWrapModulus: Math.PI * 2,
  emissionStride: 1,
};

function buildDefaultFrequencies(count) {
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const centered = i - (count - 1) / 2;
    // Deterministic heterogeneous natural frequencies around ~1.0.
    values.push(1.0 + 0.055 * centered + 0.03 * Math.sin(i * 0.9));
  }
  return values;
}

function buildInitialPhases(count) {
  const values = [];
  for (let i = 0; i < count; i += 1) {
    // Spread phases around the circle with a small deterministic jitter.
    const base = (2 * Math.PI * i) / count;
    values.push(base + 0.35 * Math.sin(i * 1.7));
  }
  return values;
}

function buildCouplingMatrix(count) {
  const matrix = [];
  const half = Math.floor(count / 2);
  for (let i = 0; i < count; i += 1) {
    const row = [];
    for (let j = 0; j < count; j += 1) {
      if (i === j) {
        row.push(0);
        continue;
      }
      const d = Math.abs(i - j);
      const ringDistance = Math.min(d, count - d);
      const sameCommunity = (i < half) === (j < half);
      let weight = Math.exp(-ringDistance / 2.2);
      if (sameCommunity) {
        weight += 0.25;
      } else {
        weight -= 0.08;
      }
      row.push(weight);
    }
    matrix.push(row);
  }
  return matrix;
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

function computeOrderMetrics(phases, frequencies) {
  if (!Array.isArray(phases) || phases.length === 0) {
    return { r: 0, psi: 0, meanFrequency: 0 };
  }

  let sumSin = 0;
  let sumCos = 0;
  for (const phase of phases) {
    sumSin += Math.sin(phase);
    sumCos += Math.cos(phase);
  }
  const meanSin = sumSin / phases.length;
  const meanCos = sumCos / phases.length;
  const r = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
  const psi = Math.atan2(meanSin, meanCos);

  let meanFrequency = 0;
  if (Array.isArray(frequencies) && frequencies.length > 0) {
    meanFrequency = frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length;
  }

  return { r, psi, meanFrequency };
}

function clearKuramotoWorld(context) {
  const { entityManager, componentManager } = context;
  const targets = new Set();

  for (const entity of componentManager.getEntitiesWithComponent(components.oscillator_count)) {
    targets.add(entity);
  }
  for (const entity of componentManager.getEntitiesWithComponent(components.osc_id)) {
    targets.add(entity);
  }
  for (const entity of componentManager.getEntitiesWithComponent(components.series_tick)) {
    targets.add(entity);
  }

  for (const entity of targets) {
    if (!entityManager.has(entity)) {
      continue;
    }
    componentManager.removeAll(entity);
    entityManager.remove(entity);
  }
}

function ensureWorld(context) {
  const { entityManager, componentManager } = context;
  const existingWorld = componentManager.getEntitiesWithComponent(components.oscillator_count);
  if (existingWorld.length > 0) {
    return;
  }
  const world = entityManager.create();
  const frequencies = buildDefaultFrequencies(DEFAULTS.oscillatorCount);
  const initialPhases = buildInitialPhases(DEFAULTS.oscillatorCount);
  const couplingMatrix = buildCouplingMatrix(DEFAULTS.oscillatorCount);

  componentManager.addComponent(world, components.oscillator_count, DEFAULTS.oscillatorCount);
  componentManager.addComponent(world, components.integration_dt_s, DEFAULTS.dt);
  componentManager.addComponent(world, components.total_ticks, DEFAULTS.totalTicks);
  componentManager.addComponent(world, components.coupling_scale_k, DEFAULTS.couplingScale);
  componentManager.addComponent(world, components.topology_mode, DEFAULTS.topology);
  componentManager.addComponent(world, components.phase_wrap_modulus, DEFAULTS.phaseWrapModulus);
  componentManager.addComponent(world, components.emission_stride_ticks, DEFAULTS.emissionStride);
  componentManager.addComponent(world, components.default_frequency_set, frequencies.slice());
  componentManager.addComponent(world, components.default_initial_phase_set, initialPhases.slice());
  componentManager.addComponent(
    world,
    components.default_coupling_matrix,
    couplingMatrix.map((row) => row.slice()),
  );
  componentManager.addComponent(world, components.sim_tick, 0);
  componentManager.addComponent(world, components.sim_time_s, 0);
  componentManager.addComponent(world, components.run_complete, false);

  const wrappedInitialPhases = initialPhases.map((phase) =>
    wrapPhase(phase, DEFAULTS.phaseWrapModulus),
  );

  for (let i = 0; i < DEFAULTS.oscillatorCount; i += 1) {
    const oscillator = entityManager.create();
    const phase = wrappedInitialPhases[i];
    const frequency = frequencies[i];
    componentManager.addComponent(oscillator, components.osc_id, i + 1);
    componentManager.addComponent(oscillator, components.osc_natural_frequency, frequency);
    componentManager.addComponent(oscillator, components.osc_initial_phase, phase);
    componentManager.addComponent(oscillator, components.osc_phase, phase);
    componentManager.addComponent(oscillator, components.osc_phase_velocity, frequency);
    componentManager.addComponent(oscillator, components.osc_signal_sin, Math.sin(phase));
    componentManager.addComponent(oscillator, components.osc_signal_cos, Math.cos(phase));
    componentManager.addComponent(
      oscillator,
      components.osc_coupling_weights,
      couplingMatrix[i].slice(),
    );
  }

  const order = computeOrderMetrics(wrappedInitialPhases, frequencies);
  const series = entityManager.create();
  componentManager.addComponent(series, components.series_tick, 0);
  componentManager.addComponent(series, components.series_time_s, 0);
  componentManager.addComponent(
    series,
    components.series_phase_by_oscillator,
    wrappedInitialPhases.slice(),
  );
  componentManager.addComponent(
    series,
    components.series_signal_by_oscillator,
    wrappedInitialPhases.map((phase) => Math.sin(phase)),
  );
  componentManager.addComponent(series, components.series_order_parameter_r, order.r);
  componentManager.addComponent(series, components.series_order_parameter_psi, order.psi);
  componentManager.addComponent(series, components.series_mean_frequency, order.meanFrequency);
}

function createSystem() {
  const state = {
    bootstrapped: false,
  };

  return {
    initialize(context) {
      if (!state.bootstrapped) {
        clearKuramotoWorld(context);
        state.bootstrapped = true;
      }
      ensureWorld(context);
    },
    update(context) {
      if (!state.bootstrapped) {
        clearKuramotoWorld(context);
        state.bootstrapped = true;
      }
      ensureWorld(context);
    },
  };
}

module.exports = { createSystem };
