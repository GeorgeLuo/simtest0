const metricsComponents = require('../components/kuramotoEvaluation');

const FRAME_COMPONENT = {
  id: 'evaluation.frame',
  description: 'Simulation frame payload for evaluation.',
  validate: () => true,
};

const TWO_PI = Math.PI * 2;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function unwrapPayload(value) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'payload')) {
    return value.payload;
  }
  return value;
}

function getLatestFrame(componentManager) {
  const entities = componentManager.getEntitiesWithComponent(FRAME_COMPONENT);
  let latest = null;

  for (const entity of entities) {
    const instance = componentManager.getComponent(entity, FRAME_COMPONENT);
    if (!instance || !instance.payload) {
      continue;
    }
    const frame = instance.payload;
    if (!latest || (isFiniteNumber(frame.tick) && frame.tick > latest.tick)) {
      latest = frame;
    }
  }

  return latest;
}

function normalizeComponentMap(entityValue) {
  if (!entityValue || typeof entityValue !== 'object') {
    return null;
  }

  if (entityValue.components && Array.isArray(entityValue.components)) {
    const map = Object.create(null);
    for (const entry of entityValue.components) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const id = typeof entry.id === 'string' ? entry.id : null;
      if (!id) {
        continue;
      }
      map[id] = unwrapPayload(
        Object.prototype.hasOwnProperty.call(entry, 'payload') ? entry.payload : entry.value,
      );
    }
    return map;
  }

  if (entityValue.components && typeof entityValue.components === 'object') {
    const map = Object.create(null);
    for (const [id, value] of Object.entries(entityValue.components)) {
      map[id] = unwrapPayload(value);
    }
    return map;
  }

  const direct = Object.create(null);
  for (const [id, value] of Object.entries(entityValue)) {
    if (id === 'entityId' || id === 'id') {
      continue;
    }
    direct[id] = unwrapPayload(value);
  }
  return direct;
}

function normalizeEntities(frame) {
  const entities = frame?.entities;
  if (!entities) {
    return [];
  }

  if (Array.isArray(entities)) {
    return entities
      .map((entityValue) => normalizeComponentMap(entityValue))
      .filter((value) => value && typeof value === 'object');
  }

  if (typeof entities === 'object') {
    return Object.values(entities)
      .map((entityValue) => normalizeComponentMap(entityValue))
      .filter((value) => value && typeof value === 'object');
  }

  return [];
}

function circularDistance(a, b, modulus = TWO_PI) {
  if (!isFiniteNumber(a) || !isFiniteNumber(b)) {
    return null;
  }
  const diff = Math.abs(a - b) % modulus;
  return Math.min(diff, modulus - diff);
}

function extractOscillators(frameEntities) {
  const oscillators = [];
  for (const components of frameEntities) {
    const id = components.osc_id;
    const phase = components.osc_phase;
    if (!Number.isInteger(id) || !isFiniteNumber(phase)) {
      continue;
    }
    oscillators.push({
      id,
      phase,
      phaseVelocity: isFiniteNumber(components.osc_phase_velocity)
        ? components.osc_phase_velocity
        : null,
    });
  }
  oscillators.sort((a, b) => a.id - b.id);
  return oscillators;
}

function findSeriesSnapshot(frameEntities) {
  for (const components of frameEntities) {
    if (!isFiniteNumber(components.series_order_parameter_r)) {
      continue;
    }
    return {
      tick: Number.isInteger(components.series_tick) ? components.series_tick : null,
      time: isFiniteNumber(components.series_time_s) ? components.series_time_s : null,
      r: components.series_order_parameter_r,
      psi: isFiniteNumber(components.series_order_parameter_psi)
        ? components.series_order_parameter_psi
        : null,
      meanFrequency: isFiniteNumber(components.series_mean_frequency)
        ? components.series_mean_frequency
        : null,
    };
  }
  return null;
}

function computeOrderFromPhases(phases) {
  if (!Array.isArray(phases) || phases.length === 0) {
    return { r: null, psi: null };
  }
  let sumSin = 0;
  let sumCos = 0;
  for (const phase of phases) {
    sumSin += Math.sin(phase);
    sumCos += Math.cos(phase);
  }
  const meanSin = sumSin / phases.length;
  const meanCos = sumCos / phases.length;
  return {
    r: Math.sqrt(meanSin * meanSin + meanCos * meanCos),
    psi: Math.atan2(meanSin, meanCos),
  };
}

function computePairwise(oscillators) {
  const byPair = Object.create(null);
  let maxDistance = null;
  for (let i = 0; i < oscillators.length; i += 1) {
    for (let j = i + 1; j < oscillators.length; j += 1) {
      const left = oscillators[i];
      const right = oscillators[j];
      const key = `${left.id}_${right.id}`;
      const distance = circularDistance(left.phase, right.phase, TWO_PI);
      byPair[key] = distance;
      if (distance != null && (maxDistance == null || distance > maxDistance)) {
        maxDistance = distance;
      }
    }
  }
  return { byPair, maxDistance };
}

function computeMetrics(frame) {
  const frameEntities = normalizeEntities(frame);
  const oscillators = extractOscillators(frameEntities);
  const phases = oscillators.map((oscillator) => oscillator.phase);
  const velocities = oscillators
    .map((oscillator) => oscillator.phaseVelocity)
    .filter((value) => isFiniteNumber(value));

  const snapshot = findSeriesSnapshot(frameEntities);
  const orderFromPhases = computeOrderFromPhases(phases);
  const pairwise = computePairwise(oscillators);

  const r = snapshot?.r ?? orderFromPhases.r;
  const psi = snapshot?.psi ?? orderFromPhases.psi;
  const meanFrequency =
    snapshot?.meanFrequency ??
    (velocities.length > 0
      ? velocities.reduce((sum, value) => sum + value, 0) / velocities.length
      : null);

  return {
    metrics: {
      tick: Number.isInteger(frame.tick) ? frame.tick : snapshot?.tick ?? null,
      time_s: isFiniteNumber(snapshot?.time) ? snapshot.time : null,
      oscillator_count: oscillators.length,
      order_parameter_r: r,
      order_parameter_psi: psi,
      mean_frequency: meanFrequency,
      max_pairwise_phase_distance: pairwise.maxDistance,
      synchronized: isFiniteNumber(r) ? r >= 0.95 : false,
    },
    pairwise: {
      tick: Number.isInteger(frame.tick) ? frame.tick : snapshot?.tick ?? null,
      distances: pairwise.byPair,
    },
  };
}

function upsertMetrics(context) {
  const { entityManager, componentManager } = context;
  const latestFrame = getLatestFrame(componentManager);
  if (!latestFrame) {
    return;
  }

  const computed = computeMetrics(latestFrame);
  const entities = componentManager.getEntitiesWithComponent(metricsComponents.kuramoto_eval_metrics);
  const target = entities[0] ?? entityManager.create();
  componentManager.addComponent(target, metricsComponents.kuramoto_eval_metrics, computed.metrics);
  componentManager.addComponent(target, metricsComponents.kuramoto_eval_pairwise, computed.pairwise);
}

function createSystem() {
  return {
    update(context) {
      upsertMetrics(context);
    },
  };
}

module.exports = { createSystem };
