#!/usr/bin/env node

/**
 * Morphcloud SimEval validator
 *
 * This script runs a full control-surface exercise against a freshly booted
 * SimEval instance (typically provisioned via tools/cli/morphcloud_build_instance.sh).
 * It uploads purpose-built simulation and evaluation plugins, injects them,
 * starts the simulation, and asserts both simulation and evaluation streams
 * emit the validator component data.
 *
 * Usage:
 *   node tools/cli/morphcloud_validator.js --url https://host/api --token TOKEN
 *
 * Environment variables:
 *   MORPH_VALIDATOR_URL   Base URL for the SimEval API (e.g., https://host/api)
 *   MORPH_VALIDATOR_TOKEN Authorization token (raw or Bearer-prefixed)
 */

const crypto = require('crypto');
const { TextDecoder } = require('util');

if (typeof fetch !== 'function') {
  console.error('This script requires Node.js 18+ (fetch API not found).');
  process.exit(1);
}

const argv = process.argv.slice(2);
const args = parseArgs(argv);
const baseUrl = (args.url ?? process.env.MORPH_VALIDATOR_URL ?? '').trim();
const rawToken = (args.token ?? process.env.MORPH_VALIDATOR_TOKEN ?? process.env.SIMEVAL_AUTH_TOKEN ?? '').trim();

if (!baseUrl) {
  console.error('Error: --url or MORPH_VALIDATOR_URL is required (e.g., https://host/api).');
  process.exit(1);
}

const authHeader = rawToken
  ? rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`
  : null;

const httpHeaders = {
  'User-Agent': 'simtest0-morph-validator/1.0',
};
if (authHeader) {
  httpHeaders.Authorization = authHeader;
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
const pluginRoot = `plugins/validators/${timestamp}`;
const simComponentFile = `${pluginRoot}/simulation_temperature_component.js`;
const simSystemFile = `${pluginRoot}/simulation_temperature_system.js`;
const evalComponentFile = `${pluginRoot}/evaluation_report_component.js`;
const evalSystemFile = `${pluginRoot}/evaluation_report_system.js`;

const state = {
  simulationSystemId: null,
  evaluationSystemId: null,
  registeredSimulationComponent: 'validator.temperature',
  registeredEvaluationComponent: 'validator.evaluation',
};

async function main() {
  console.log(`[validator] Target: ${baseUrl}`);
  await ensureHealthy();
  await uploadPlugins();
  let simulationTemperatures = null;
  try {
    await registerComponents();
    await injectSystems();
    const simulationPromise = collectSseEvents('/simulation/stream', { maxEvents: 6, timeoutMs: 8000 });
    const evaluationPromise = collectSseEvents('/evaluation/stream', { maxEvents: 6, timeoutMs: 8000 });
    await startSimulation();
    simulationTemperatures = await verifyStreams(simulationPromise, evaluationPromise);
  } finally {
    await tryPauseAndStop();
    await ejectSystems();
    await deregisterComponents();
  }

  console.log('[validator] Validation completed successfully.');
}

async function ensureHealthy() {
  console.log('[validator] Checking health endpoint...');
  const health = await fetchJson('/health');
  if (health.status !== 'success') {
    throw new Error('Health endpoint did not report success');
  }
}

async function uploadPlugins() {
  console.log('[validator] Uploading validator plugins...');
  await Promise.all([
    uploadPlugin(simComponentFile, buildSimulationComponentSource()),
    uploadPlugin(simSystemFile, buildSimulationSystemSource()),
    uploadPlugin(evalComponentFile, buildEvaluationComponentSource()),
    uploadPlugin(evalSystemFile, buildEvaluationSystemSource()),
  ]);
}

async function registerComponents() {
  console.log('[validator] Registering component types...');
  await postJson('/simulation/component', {
    messageId: `sim-component-${timestamp}`,
    component: { modulePath: simComponentFile },
  });
  await postJson('/evaluation/component', {
    messageId: `eval-component-${timestamp}`,
    component: { modulePath: evalComponentFile },
  });
}

async function injectSystems() {
  console.log('[validator] Injecting simulation system...');
  const simResponse = await postJson('/simulation/system', {
    messageId: `sim-system-${timestamp}`,
    system: {
      modulePath: simSystemFile,
      exportName: 'createValidatorSimulationSystem',
    },
  });
  assertSuccess(simResponse, 'Simulation system injection failed');
  if (typeof simResponse.systemId !== 'string') {
    throw new Error('Simulation injection response missing systemId');
  }
  state.simulationSystemId = simResponse.systemId;

  console.log('[validator] Injecting evaluation system...');
  const evalResponse = await postJson('/evaluation/system', {
    messageId: `eval-system-${timestamp}`,
    system: {
      modulePath: evalSystemFile,
      exportName: 'createValidatorEvaluationSystem',
    },
  });
  assertSuccess(evalResponse, 'Evaluation system injection failed');
  if (typeof evalResponse.systemId !== 'string') {
    throw new Error('Evaluation injection response missing systemId');
  }
  state.evaluationSystemId = evalResponse.systemId;
}

async function startSimulation() {
  console.log('[validator] Starting simulation player...');
  const startResponse = await postJson('/simulation/start', {
    messageId: `start-${timestamp}`,
  });
  assertSuccess(startResponse, 'Simulation start failed');
}

async function verifyStreams(simulationPromise, evaluationPromise) {
  console.log('[validator] Observing simulation/evaluation streams for validator payloads...');
  const [simulationEvents, evaluationEvents] = await Promise.all([simulationPromise, evaluationPromise]);

  const simulationFrames = parseFrameEvents(simulationEvents);
  const evaluationFrames = parseFrameEvents(evaluationEvents);

  if (!simulationFrames.some(hasValidatorTemperature)) {
    throw new Error('Simulation stream did not include validator.temperature component');
  }
  if (!evaluationFrames.some(hasValidatorTemperature)) {
    throw new Error('Evaluation stream did not reflect validator.temperature component');
  }

  const temperatureByTick = collectValidatorTemperatures(simulationFrames);
  console.log(`[validator] Simulation stream emitted ${simulationFrames.length} frames with validator data.`);
  validateInterplay(evaluationFrames, temperatureByTick);
  console.log(
    `[validator] Evaluation stream emitted ${evaluationFrames.length} frames with validator data (interplay verified).`,
  );

  return temperatureByTick;
}

async function tryPauseAndStop() {
  try {
    await postJson('/simulation/pause', { messageId: `pause-${timestamp}` });
  } catch {
    /* ignore */
  }

  try {
    await postJson('/simulation/stop', { messageId: `stop-${timestamp}` });
  } catch {
    /* ignore */
  }
}

async function ejectSystems() {
  if (state.simulationSystemId) {
    await safeDelete(`/simulation/system/${encodeURIComponent(state.simulationSystemId)}`);
    state.simulationSystemId = null;
  }
  if (state.evaluationSystemId) {
    await safeDelete(`/evaluation/system/${encodeURIComponent(state.evaluationSystemId)}`);
    state.evaluationSystemId = null;
  }
}

async function deregisterComponents() {
  await safeDelete(`/simulation/component/${encodeURIComponent(state.registeredSimulationComponent)}`);
  await safeDelete(`/evaluation/component/${encodeURIComponent(state.registeredEvaluationComponent)}`);
}

async function uploadPlugin(path, source) {
  const response = await postJson('/codebase/plugin', {
    messageId: `plugin-${crypto.randomUUID()}`,
    path,
    content: source,
    overwrite: true,
  });
  assertSuccess(response, `Failed to upload plugin ${path}`);
}

async function safeDelete(path) {
  try {
    await request(path, { method: 'DELETE' });
  } catch {
    /* ignore cleanup errors */
  }
}

function assertSuccess(response, message) {
  if (!response || response.status !== 'success') {
    const detail = response?.detail ?? 'unknown error';
    throw new Error(`${message}: ${detail}`);
  }
}

function buildSimulationComponentSource() {
  return `'use strict';

module.exports = {
  id: 'validator.temperature',
  description: 'Synthetic temperature readings emitted by the Morphcloud validator.',
  validate(payload) {
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      typeof payload.value === 'number' &&
      Number.isFinite(payload.value)
    );
  },
};
`;
}

function buildSimulationSystemSource() {
  return `'use strict';

const temperatureComponent = require('./${basename(simComponentFile)}');

function createValidatorSimulationSystem() {
  let entity = null;
  let nextValue = 20;

  return {
    initialize(context) {
      entity = context.entityManager.create();
      context.componentManager.addComponent(entity, temperatureComponent, {
        value: nextValue,
        updatedAt: Date.now(),
      });
    },
    update(context) {
      if (entity === null || !context.entityManager.has(entity)) {
        entity = context.entityManager.create();
      }
      nextValue += 1;
      context.componentManager.addComponent(entity, temperatureComponent, {
        value: nextValue,
        updatedAt: Date.now(),
      });
    },
  };
}

module.exports = { createValidatorSimulationSystem };
`;
}

function buildEvaluationComponentSource() {
  return `'use strict';

module.exports = {
  id: 'validator.evaluation',
  description: 'Echo of validator temperature readings captured by the evaluation player.',
  validate(payload) {
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      typeof payload.tick === 'number' &&
      Number.isFinite(payload.tick) &&
      typeof payload.temperature === 'number'
    );
  },
};
`;
}

function buildEvaluationSystemSource() {
  return `'use strict';

const evaluationComponent = require('./${basename(evalComponentFile)}');

function createValidatorEvaluationSystem() {
  return {
    update(context) {
      const entities = context.entityManager.list();
      for (const entity of entities) {
        const components = context.componentManager.getComponents(entity);
        if (!Array.isArray(components)) {
          continue;
        }
        const frameInstance = components.find(
          (component) => component && component.type && component.type.id === 'evaluation.frame',
        );
        if (!frameInstance || !frameInstance.payload) {
          continue;
        }
        const temperature = extractTemperature(frameInstance.payload);
        if (typeof temperature !== 'number') {
          continue;
        }
        context.componentManager.addComponent(entity, evaluationComponent, {
          tick: frameInstance.payload.tick,
          temperature,
        });
      }
    },
  };
}

function extractTemperature(frame) {
  if (!frame || typeof frame !== 'object' || !frame.entities) {
    return undefined;
  }
  for (const entityId of Object.keys(frame.entities)) {
    const components = frame.entities[entityId];
    if (components && typeof components === 'object') {
      const reading = components['validator.temperature'];
      if (reading && typeof reading.value === 'number') {
        return reading.value;
      }
    }
  }
  return undefined;
}

module.exports = { createValidatorEvaluationSystem };
`;
}

async function collectSseEvents(path, { maxEvents = 3, timeoutMs = 4000 }) {
  const url = resolveUrl(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, { headers: httpHeaders, signal: controller.signal });
  if (!response.ok || !response.body) {
    controller.abort();
    throw new Error(`Failed to read SSE from ${path}: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const messages = [];
  let buffer = '';

  try {
    while (messages.length < maxEvents) {
      const { value, done } = await reader.read();
      if (done || !value) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let delimiterIndex;
      while ((delimiterIndex = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, delimiterIndex);
        buffer = buffer.slice(delimiterIndex + 2);
        if (!chunk.trim() || chunk.startsWith(':')) {
          continue;
        }
        if (chunk.startsWith('data:')) {
          messages.push(chunk.replace(/^data:\s*/, ''));
          if (messages.length >= maxEvents) {
            break;
          }
        }
      }
    }
  } catch (error) {
    if (!controller.signal.aborted) {
      throw error;
    }
  } finally {
    controller.abort();
    clearTimeout(timeout);
    await reader.cancel().catch(() => undefined);
  }

  if (messages.length === 0) {
    throw new Error(`No SSE data received from ${path} within ${timeoutMs}ms`);
  }
  return messages;
}

function parseFrameEvents(messages) {
  const frames = [];
  for (const message of messages) {
    try {
      const parsed = JSON.parse(message);
      if (parsed && typeof parsed === 'object' && typeof parsed.tick === 'number') {
        frames.push(parsed);
      }
    } catch {
      // ignore non-JSON chunks
    }
  }
  return frames;
}

function hasValidatorTemperature(frame) {
  if (!frame || typeof frame !== 'object' || !frame.entities) {
    return false;
  }
  return Object.values(frame.entities).some((components) => {
    if (!components || typeof components !== 'object') {
      return false;
    }
    const reading = components['validator.temperature'];
    return Boolean(reading && typeof reading.value === 'number');
  });
}

function extractValidatorTemperature(entities) {
  if (!entities || typeof entities !== 'object') {
    return undefined;
  }
  for (const components of Object.values(entities)) {
    if (!components || typeof components !== 'object') {
      continue;
    }
    const reading = components['validator.temperature'];
    if (reading && typeof reading.value === 'number') {
      return reading.value;
    }
  }
  return undefined;
}

function extractEvaluationReading(frame) {
  if (!frame || typeof frame !== 'object' || !frame.entities) {
    return null;
  }
  for (const components of Object.values(frame.entities)) {
    if (!components || typeof components !== 'object') {
      continue;
    }
    const reading = components['validator.evaluation'];
    if (
      reading &&
      typeof reading === 'object' &&
      typeof reading.tick === 'number' &&
      typeof reading.temperature === 'number'
    ) {
      return { tick: reading.tick, temperature: reading.temperature };
    }
  }
  return null;
}

function collectValidatorTemperatures(frames) {
  const map = new Map();
  for (const frame of frames) {
    const value = extractValidatorTemperature(frame.entities);
    if (typeof value === 'number' && typeof frame.tick === 'number') {
      map.set(frame.tick, value);
    }
  }
  return map;
}

function validateInterplay(evaluationFrames, simulationTemperatures) {
  if (!(simulationTemperatures instanceof Map) || simulationTemperatures.size === 0) {
    throw new Error('Simulation temperature map missing; cannot validate interplay.');
  }

  const simulationTicks = Array.from(simulationTemperatures.keys());
  const minTick = Math.min(...simulationTicks);
  const maxTick = Math.max(...simulationTicks);
  const simulationValues = new Set(simulationTemperatures.values());
  let validatedCount = 0;
  let tickMatches = 0;
  let valueMatches = 0;

  const mismatches = [];
  for (const frame of evaluationFrames) {
    const reading = extractEvaluationReading(frame);
    if (!reading) {
      continue;
    }

    if (reading.tick < minTick || reading.tick > maxTick) {
      if (simulationValues.has(reading.temperature)) {
        valueMatches += 1;
      } else {
        mismatches.push(
          `Temperature ${reading.temperature} not found in simulation readings (tick ${reading.tick})`,
        );
      }
      continue;
    }

    validatedCount += 1;
    tickMatches += 1;
    const expected = simulationTemperatures.get(reading.tick);
    if (typeof expected !== 'number') {
      mismatches.push(`No simulation reading for evaluation tick ${reading.tick}`);
      continue;
    }

    if (Math.abs(expected - reading.temperature) > 1e-9) {
      mismatches.push(
        `Tick ${reading.tick}: simulation temperature ${expected} != evaluation temperature ${reading.temperature}`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Simulation/Evaluation interplay mismatch detected:\n- ${mismatches.join('\n- ')}`);
  }

  if (validatedCount === 0) {
    if (valueMatches > 0) {
      console.log(
        '[validator] Warning: evaluation ticks did not overlap simulation ticks; matched on temperature values instead.',
      );
      return;
    }
    throw new Error('Simulation/Evaluation interplay mismatch detected: no overlapping ticks observed.');
  }
}

async function fetchJson(path, options = {}) {
  const response = await request(path, options);
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 200)}`);
  }
}

async function postJson(path, body) {
  return fetchJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function request(path, options = {}) {
  const url = resolveUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...httpHeaders,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request to ${url} failed: ${response.status} ${response.statusText} ${detail}`);
  }
  return response;
}

function resolveUrl(path) {
  const trimmed = path.startsWith('/') ? path.slice(1) : path;
  return new URL(trimmed, ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

function basename(relativePath) {
  const segments = relativePath.split('/');
  return segments[segments.length - 1] || relativePath;
}

function parseArgs(raw) {
  const result = {};
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const value = raw[i + 1];
    if (value && !value.startsWith('--')) {
      result[key] = value;
      i += 1;
    } else {
      result[key] = true;
    }
  }
  return result;
}

main().catch((error) => {
  console.error('[validator] Validation failed:', error);
  process.exit(1);
});
