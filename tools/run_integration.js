#!/usr/bin/env node

/*
 * Sim-Eval integration workflow runner.
 *
 * Steps align with Phase 3 guidance:
 * 1. Start the service programmatically.
 * 2. Probe the API landing page for discoverability metadata.
 * 3. Ensure the simulation SSE stream is idle before playback.
 * 4. Inject the temperature control system via HTTP.
 * 5. Start and stop the simulation to confirm control surface readiness.
 */

const path = require('path');
const { promises: fs } = require('fs');
const { setTimeout: delay } = require('timers/promises');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const workspaceDir = path.join(rootDir, 'workspaces', 'Describing_Simulation_0');
  const distMainPath = path.join(workspaceDir, 'dist', 'main.js');

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { start } = require(distMainPath);

  const host = '127.0.0.1';
  const port = 3123;

  console.log('[integration] Starting SimEval server...');
  const server = await start({ port, host, log: (message) => console.log(`[server] ${message}`) });

  try {
    await verifyLanding(host, port);
    await verifyIdleStream(host, port);
    await injectTemperatureSystem(host, port);
    const sseSnapshots = await exerciseControls(host, port);
    await persistArtifacts(rootDir, sseSnapshots);
    console.log('[integration] Workflow completed successfully.');
  } finally {
    console.log('[integration] Shutting down server...');
    await server.stop();
  }
}

async function verifyLanding(host, port) {
  console.log('[integration] Checking API landing metadata...');
  const response = await fetchJson(`http://${host}:${port}/api`);
  if (!Array.isArray(response.segments) || response.segments.length === 0) {
    throw new Error('API landing page missing segments');
  }
  if (!Array.isArray(response.documents) || response.documents.length === 0) {
    throw new Error('API landing page missing documentation references');
  }

  const docPath = response.documents[0]?.path;
  if (typeof docPath !== 'string') {
    throw new Error('Document path missing from metadata response');
  }

  const docResponse = await fetchJson(`http://${host}:${port}${docPath}`);
  if (!docResponse || typeof docResponse.content !== 'string' || docResponse.content.length === 0) {
    throw new Error('Unable to fetch informational document content');
  }
}

async function verifyIdleStream(host, port) {
  console.log('[integration] Verifying simulation SSE stream is idle...');
  const controller = new AbortController();
  const response = await fetch(`http://${host}:${port}/api/simulation/stream`, { signal: controller.signal });
  if (!response.ok) {
    controller.abort();
    throw new Error(`Unexpected SSE status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body');
  }

  const result = await Promise.race([
    reader.read(),
    delay(400).then(() => ({ value: undefined })),
  ]);

  controller.abort();
  await reader.cancel().catch(() => undefined);

  if (result?.value && result.value.length > 0) {
    throw new Error('Received SSE payload before simulation start');
  }
}

async function injectTemperatureSystem(host, port) {
  console.log('[integration] Injecting temperature control system...');
  const response = await fetchJson(`http://${host}:${port}/api/simulation/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messageId: 'integration-inject',
      system: {
        modulePath: 'plugins/simulation/temperatureControlSystem.js',
        exportName: 'createTemperatureControlSystem',
      },
    }),
  });

  if (response.status !== 'success') {
    throw new Error(`System injection failed: ${response.detail ?? 'unknown error'}`);
  }
}

async function exerciseControls(host, port) {
  console.log('[integration] Exercising simulation control routes...');
  const startResponse = await fetchJson(`http://${host}:${port}/api/simulation/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: 'integration-start' }),
  });

  if (startResponse.status !== 'success') {
    throw new Error(`Simulation start failed: ${startResponse.detail ?? 'unknown error'}`);
  }

  const simulationMessages = await collectSseMessages(host, port, '/api/simulation/stream');
  const evaluationMessages = await collectSseMessages(host, port, '/api/evaluation/stream');

  for (const action of ['pause', 'stop']) {
    const response = await fetchJson(`http://${host}:${port}/api/simulation/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: `integration-${action}` }),
    });

    if (response.status !== 'success') {
      throw new Error(`Simulation ${action} failed: ${response.detail ?? 'unknown error'}`);
    }
  }

  return { simulationMessages, evaluationMessages };
}

async function collectSseMessages(host, port, path) {
  const url = `http://${host}:${port}${path}`;
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body');
  }

  const decoder = new TextDecoder();
  const messages = [];
  let buffer = '';

  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    while (messages.length < 5) {
      const result = await Promise.race([
        reader.read(),
        delay(1000).then(() => ({ done: false, value: undefined })),
      ]);

      if (!result || result.done) {
        break;
      }

      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
      }

      let delimiterIndex;
      while ((delimiterIndex = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, delimiterIndex).trim();
        buffer = buffer.slice(delimiterIndex + 2);

        if (chunk.startsWith('data:')) {
          const payload = chunk.slice(5).trim();
          try {
            messages.push(JSON.parse(payload));
          } catch {
            messages.push(payload);
          }
        }
      }
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
    await reader.cancel().catch(() => undefined);
  }

  return messages;
}

async function persistArtifacts(rootDir, snapshots) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .replace('Z', '');

  const artifact = {
    generatedAt: new Date().toISOString(),
    simulationMessages: snapshots.simulationMessages,
    evaluationMessages: snapshots.evaluationMessages,
  };

  const directory = path.join(rootDir, 'verifications');
  const filePath = path.join(directory, `${timestamp}_integration.json`);
  await fs.writeFile(filePath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`[integration] Captured output -> ${path.relative(rootDir, filePath)}`);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

main().catch((error) => {
  console.error('[integration] Failed:', error);
  process.exitCode = 1;
});
