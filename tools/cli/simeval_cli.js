#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { TextDecoder } = require('util');
const { Readable } = require('stream');
const { setTimeout: delay } = require('timers/promises');
const { loadCliConfig, resolveCliConfigPath: resolveCliConfigLocation } = require('./cli_config');

if (typeof fetch !== 'function') {
  console.error('This tool requires Node.js 18+ (fetch API is unavailable).');
  process.exit(1);
}

const argv = process.argv.slice(2);
let CLI_CONFIG = null;
const DEFAULT_CLI_CONFIG_PATH = path.join(os.homedir(), '.simeval', 'config.json');
const DEFAULT_UI_HOST = '127.0.0.1';
const DEFAULT_UI_PORT = 5050;
const DEFAULT_UI_DIRNAME = 'Stream-Metrics-UI';
const DEFAULT_FLEET_LABELS = {
  instance: [
    'simeval.run=${runId}',
    'simeval.deployment=${deployment}',
    'simeval.instance=${instance}',
  ],
  snapshot: [
    'name=simeval-${deployment}-${instance}-${runId}',
    'simeval.run=${runId}',
    'simeval.deployment=${deployment}',
    'simeval.instance=${instance}',
  ],
};
const DEFAULT_FLEET_CLEANUP = {
  snapshot: true,
  stop: true,
  stopOnFailure: true,
  forget: false,
};

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  printUsage();
  process.exit(0);
}

main().catch((error) => {
  console.error(`[simeval-cli] ${error.message ?? error}`);
  process.exit(1);
});

async function main() {
  const [command, ...rest] = argv;
  const allowMissingCliConfig = command === 'config';
  CLI_CONFIG = loadCliConfig({
    argv,
    defaultPath: DEFAULT_CLI_CONFIG_PATH,
    allowMissing: allowMissingCliConfig,
  });
  if (!process.env.MORPH_API_KEY && CLI_CONFIG?.data?.morphApiKey) {
    process.env.MORPH_API_KEY = CLI_CONFIG.data.morphApiKey;
  }

  switch (command) {
    case 'health':
      return handleHealth(rest);
    case 'status':
      return handleStatus(rest);
    case 'start':
    case 'pause':
    case 'stop':
      return handlePlayback(command, rest);
    case 'system':
      return handleSystem(rest);
    case 'component':
      return handleComponent(rest);
    case 'plugin':
      return handlePlugin(rest);
    case 'stream':
      return handleStream(rest);
    case 'ui':
      return handleUi(rest);
    case 'config':
      return handleConfig(rest);
    case 'run':
      return handleRun(rest);
    case 'wait':
      return handleWait(rest);
    case 'deploy':
      return handleDeploy(rest);
    case 'morphcloud':
      return handleMorphcloud(rest);
    case 'fleet':
      return handleFleet(rest);
    case 'log':
      return handleLog(rest);
    case 'codebase':
      return handleCodebase(rest);
    default:
      printUsage(`Unknown command: ${command}`);
      return undefined;
  }
}

async function handleHealth(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('health');
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);
  const url = buildUrl(server, '/health');
  const response = await requestJson(url, { method: 'GET' }, authHeader);
  printJson(response);
}

async function handleStatus(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('status');
    return;
  }

  if ((options.prune || options['prune-morph'] || options['stop-morph']) && !options.all) {
    throw new Error('Use --all with --prune or --prune-morph.');
  }

  if (options.all) {
    await handleStatusAll(options);
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);
  const url = buildUrl(server, '/status');
  const response = await requestJson(url, { method: 'GET' }, authHeader);
  printJson(response);
}

async function handleStatusAll(options) {
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const checkedAt = new Date().toISOString();
  const pruneLocal = Boolean(options.prune);
  const pruneMorph = Boolean(options['prune-morph'] || options['stop-morph']);
  const stopMorph = Boolean(options['stop-morph']);
  const signal = typeof options.signal === 'string' ? options.signal : 'SIGTERM';

  const deployStateFile = resolveDeployStateFile(options);
  const deployState = loadDeployState(deployStateFile);
  const localDeployments = await Promise.all(
    Object.entries(deployState.deployments).map(([key, record]) =>
      checkLocalDeployment(record, timeoutMs, key),
    ),
  );

  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const uiDeployments = await Promise.all(
    Object.entries(uiState.deployments).map(([key, record]) =>
      checkUiDeployment(record, timeoutMs, key),
    ),
  );

  const morphStateFile = resolveMorphcloudStateFile(options);
  const morphState = loadMorphcloudState(morphStateFile);
  const morphInstances = await Promise.all(
    Object.entries(morphState.instances).map(([key, record]) =>
      checkMorphcloudInstance(record, timeoutMs, key),
    ),
  );

  const pruneResults = {
    local: pruneLocal
      ? await pruneLocalDeployments({
          stateFile: deployStateFile,
          state: deployState,
          deployments: localDeployments,
          timeoutMs,
          signal,
        })
      : null,
    morphcloud: pruneMorph
      ? await pruneMorphcloudInstances({
          stateFile: morphStateFile,
          state: morphState,
          instances: morphInstances,
          stopRemote: stopMorph,
        })
      : null,
  };

  const summaryStatus = summarizeAggregateStatus({ localDeployments, morphInstances, uiDeployments });

  const payload = {
    status: summaryStatus,
    checkedAt,
    local: {
      stateFile: deployStateFile,
      updatedAt: deployState.updatedAt ?? null,
      deployments: localDeployments,
    },
    morphcloud: {
      stateFile: morphStateFile,
      updatedAt: morphState.updatedAt ?? null,
      instances: morphInstances,
    },
    prune: pruneLocal || pruneMorph ? pruneResults : null,
  };

  if (uiDeployments.length > 0) {
    payload.ui = {
      stateFile: uiStateFile,
      updatedAt: uiState.updatedAt ?? null,
      deployments: uiDeployments,
    };
  }

  printJson(payload);
}

function summarizeUiStatus(ui) {
  if (!ui || !ui.url) {
    return 'unconfigured';
  }
  if (!ui.running) {
    return 'down';
  }
  if (!ui.isUi) {
    return 'not-ui';
  }
  return 'running';
}

async function checkLocalDeployment(record, timeoutMs, key) {
  const host = record?.host ?? null;
  const port = record?.port ?? null;
  const pid = Number(record?.pid);
  const processAlive = isProcessAlive(pid);
  const server = host && port ? resolveDeployHealthHost(host, port) : null;
  const checks = server
    ? await checkServerEndpoints(server, null, timeoutMs)
    : {
        health: { ok: false, status: null, error: 'Missing host/port for deployment.' },
        status: { ok: false, status: null, error: 'Missing host/port for deployment.' },
      };
  let overall = 'unknown';
  if (!processAlive) {
    overall = checks.health.ok ? 'mismatch' : 'stopped';
  } else if (!checks.health.ok) {
    overall = 'unhealthy';
  } else {
    overall = 'healthy';
  }
  return {
    ...record,
    key: key ?? null,
    processAlive,
    server,
    health: checks.health,
    status: checks.status,
    overall,
  };
}

async function checkUiDeployment(record, timeoutMs, key) {
  const host = record?.host ?? null;
  const port = record?.port ?? null;
  const url = record?.url ?? (host && port ? `http://${host}:${port}` : null);
  const pid = Number(record?.pid);
  const processAlive = Number.isFinite(pid) ? isProcessAlive(pid) : null;
  const probe = url
    ? await probeUiHttpUrl(url, timeoutMs)
    : { running: false, isUi: false, url: null, error: 'Missing UI url.' };

  let overall = 'unknown';
  if (!url) {
    overall = 'unknown';
  } else if (probe.running && probe.isUi) {
    if (processAlive === false) {
      overall = 'mismatch';
    } else {
      overall = 'running';
    }
  } else if (probe.running && !probe.isUi) {
    overall = 'not-ui';
  } else if (!probe.running) {
    overall = processAlive ? 'unhealthy' : 'stopped';
  }

  return {
    ...record,
    key: key ?? null,
    url,
    processAlive,
    probe: {
      running: probe.running,
      isUi: probe.isUi,
      error: probe.error ?? null,
    },
    overall,
  };
}

async function checkMorphcloudInstance(record, timeoutMs, key) {
  const apiUrl = resolveMorphcloudApiUrl(record);
  const authHeader = buildAuthHeader(record?.authToken);
  const checks = apiUrl
    ? await checkServerEndpoints(apiUrl, authHeader, timeoutMs)
    : {
        health: { ok: false, status: null, error: 'Missing apiUrl for instance.' },
        status: { ok: false, status: null, error: 'Missing apiUrl for instance.' },
      };
  const stoppedAt = record?.stoppedAt ?? null;
  const overall = stoppedAt
    ? 'stopped'
    : apiUrl && checks.health.ok
      ? 'healthy'
      : apiUrl
        ? 'unhealthy'
        : 'unknown';
  return {
    id: record?.id ?? null,
    key: key ?? null,
    name: record?.name ?? null,
    snapshot: record?.snapshot ?? null,
    apiUrl,
    auth: Boolean(record?.authToken),
    publicUrl: record?.publicUrl ?? null,
    internalIp: record?.internalIp ?? null,
    port: record?.port ?? null,
    createdAt: record?.createdAt ?? null,
    stoppedAt,
    health: checks.health,
    status: checks.status,
    overall,
  };
}

async function pruneLocalDeployments({ stateFile, state, deployments, timeoutMs, signal }) {
  const prunable = new Set(['unhealthy', 'stopped', 'mismatch', 'unknown']);
  const removed = [];
  const kept = [];
  const failed = [];

  for (const deployment of deployments) {
    const key = deployment.key ?? (deployment.port !== undefined ? String(deployment.port) : null);
    if (!key) {
      failed.push({
        id: null,
        overall: deployment.overall,
        error: 'Missing deployment key.',
      });
      continue;
    }

    if (!prunable.has(deployment.overall)) {
      kept.push({ key, overall: deployment.overall });
      continue;
    }

    let stopResult = null;
    let error = null;
    let aliveAfter = deployment.processAlive;

    if (deployment.processAlive) {
      try {
        stopResult = await stopDeployment(deployment, signal, timeoutMs);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      aliveAfter = isProcessAlive(Number(deployment.pid));
    }

    if (!aliveAfter) {
      delete state.deployments[key];
      removed.push({
        key,
        overall: deployment.overall,
        stop: stopResult,
      });
    } else {
      failed.push({
        key,
        overall: deployment.overall,
        error: error || 'Process still running after stop attempt.',
        stop: stopResult,
      });
      kept.push({ key, overall: deployment.overall });
    }
  }

  if (removed.length > 0) {
    saveDeployState(stateFile, state);
  }

  return {
    stateFile,
    removed,
    kept,
    failed,
  };
}

async function pruneMorphcloudInstances({ stateFile, state, instances, stopRemote }) {
  const prunable = new Set(['unhealthy', 'stopped', 'unknown']);
  const removed = [];
  const kept = [];
  const failed = [];

  for (const instance of instances) {
    const key = instance.key ?? instance.id ?? null;
    if (!key) {
      failed.push({
        id: null,
        overall: instance.overall,
        error: 'Missing instance id.',
      });
      continue;
    }

    if (!prunable.has(instance.overall)) {
      kept.push({ id: key, overall: instance.overall });
      continue;
    }

    let stopResult = null;
    if (stopRemote && instance.overall !== 'stopped') {
      stopResult = await stopMorphcloudInstance(key);
      if (!stopResult.ok) {
        failed.push({
          id: key,
          overall: instance.overall,
          error: stopResult.error || 'Failed to stop instance.',
          stop: stopResult,
        });
        kept.push({ id: key, overall: instance.overall });
        continue;
      }
    }

    delete state.instances[key];
    removed.push({
      id: key,
      overall: instance.overall,
      stop: stopResult,
    });
  }

  if (removed.length > 0) {
    saveMorphcloudState(stateFile, state);
  }

  return {
    stateFile,
    removed,
    kept,
    failed,
  };
}

async function stopMorphcloudInstance(id) {
  if (!id) {
    return { ok: false, error: 'Missing instance id.' };
  }
  if (!process.env.MORPH_API_KEY) {
    return { ok: false, error: 'MORPH_API_KEY is not set.' };
  }
  try {
    const result = await runCommandCapture('morphcloud', ['instance', 'stop', id], {
      prefix: `[morphcloud:${id}] `,
    });
    return {
      ok: result.code === 0,
      code: result.code,
      error: result.code === 0 ? null : result.stderr || result.stdout || 'Stop failed.',
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function resolveMorphcloudApiUrl(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }
  if (record.apiUrl) {
    return record.apiUrl;
  }
  if (record.publicUrl) {
    return `${String(record.publicUrl).replace(/\/+$/, '')}/api`;
  }
  if (record.internalIp && record.port) {
    return `http://${record.internalIp}:${record.port}/api`;
  }
  return null;
}

async function checkServerEndpoints(server, authHeader, timeoutMs) {
  const healthResult = await safeRequestJson(buildUrl(server, '/health'), authHeader, timeoutMs);
  const health = summarizeHealthResult(healthResult);
  if (!healthResult.ok) {
    return {
      health,
      status: { ok: false, status: null, error: 'Skipped status check (health failed).' },
    };
  }
  const statusResult = await safeRequestJson(buildUrl(server, '/status'), authHeader, timeoutMs);
  return {
    health,
    status: summarizeStatusResult(statusResult),
  };
}

function summarizeHealthResult(result) {
  return {
    ok: result.ok,
    status: result.status ?? null,
    error: result.ok ? null : result.error ?? 'Request failed.',
  };
}

function summarizeStatusResult(result) {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status ?? null,
      error: result.error ?? 'Request failed.',
    };
  }
  const payload = result.data ?? {};
  return {
    ok: true,
    status: result.status ?? null,
    simulation: payload?.simulation?.state ?? null,
    evaluation: payload?.evaluation?.state ?? null,
  };
}

function summarizeAggregateStatus({ localDeployments, morphInstances, uiDeployments }) {
  const entries = [];
  localDeployments.forEach((deployment) => entries.push(deployment.overall));
  morphInstances.forEach((instance) => entries.push(instance.overall));
  if (Array.isArray(uiDeployments) && uiDeployments.length > 0) {
    uiDeployments.forEach((deployment) => entries.push(deployment.overall));
  }

  if (entries.length === 0) {
    return 'empty';
  }

  const okStates = new Set(['healthy', 'running']);
  const badStates = new Set(['unhealthy', 'stopped', 'unknown', 'mismatch', 'down', 'not-ui']);

  const hasOk = entries.some((value) => okStates.has(value));
  const hasBad = entries.some((value) => badStates.has(value));

  if (hasBad && hasOk) {
    return 'partial';
  }
  if (hasBad && !hasOk) {
    return 'failed';
  }
  return 'ok';
}

async function handlePlayback(action, argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage(action);
    return;
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);
  const messageId = options['message-id'] ?? buildMessageId(runContext?.id, action);
  const url = buildUrl(server, `/simulation/${action}`);
  const payload = messageId ? { messageId } : undefined;
  const response = await requestJson(
    url,
    payload
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      : { method: 'POST' },
    authHeader,
  );
  printJson(response);
  if (runContext) {
    recordRunEvent(runContext, {
      type: 'playback',
      action,
      messageId: payload?.messageId ?? null,
      response,
    });
  }
}

async function handleSystem(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('system');
    return;
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'inject') {
    const modulePath = options.module;
    if (!modulePath) {
      throw new Error('Missing --module for system injection.');
    }
    const exportName = options.export;
    const messageId = options['message-id'] ?? buildMessageId(runContext?.id, `${player}-inject`);
    const payload = {
      messageId,
      system: {
        modulePath,
        exportName: exportName || undefined,
      },
    };
    const url = buildUrl(server, `/${player}/system`);
    const response = await requestJson(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'system-inject',
        player,
        modulePath,
        exportName: exportName || null,
        messageId,
        response,
      });
    }
    return;
  }

  if (subcommand === 'eject') {
    const systemId = options['system-id'];
    if (!systemId) {
      throw new Error('Missing --system-id for system ejection.');
    }
    const url = buildUrl(server, `/${player}/system/${systemId}`);
    const response = await requestJson(url, { method: 'DELETE' }, authHeader);
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'system-eject',
        player,
        systemId,
        response,
      });
    }
    return;
  }

  throw new Error(`Unknown system subcommand: ${subcommand}`);
}

async function handleComponent(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('component');
    return;
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'inject') {
    const modulePath = options.module;
    if (!modulePath) {
      throw new Error('Missing --module for component injection.');
    }
    const exportName = options.export;
    const messageId = options['message-id'] ?? buildMessageId(runContext?.id, `${player}-component-inject`);
    const payload = {
      messageId,
      component: {
        modulePath,
        exportName: exportName || undefined,
      },
    };
    const url = buildUrl(server, `/${player}/component`);
    const response = await requestJson(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'component-inject',
        player,
        modulePath,
        exportName: exportName || null,
        messageId,
        response,
      });
    }
    return;
  }

  if (subcommand === 'eject') {
    const componentId = options['component-id'];
    if (!componentId) {
      throw new Error('Missing --component-id for component ejection.');
    }
    const url = buildUrl(server, `/${player}/component/${componentId}`);
    const response = await requestJson(url, { method: 'DELETE' }, authHeader);
    printJson(response);
    if (runContext) {
      recordRunEvent(runContext, {
        type: 'component-eject',
        player,
        componentId,
        response,
      });
    }
    return;
  }

  throw new Error(`Unknown component subcommand: ${subcommand}`);
}

async function handlePlugin(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('plugin');
    return;
  }

  if (subcommand !== 'upload') {
    throw new Error(`Unknown plugin subcommand: ${subcommand}`);
  }

  const sourcePath = options.source;
  if (!sourcePath) {
    throw new Error('Missing --source for plugin upload.');
  }

  const resolvedSource = path.resolve(process.cwd(), sourcePath);
  const content = fs.readFileSync(resolvedSource, 'utf8');
  const inferredPath = inferPluginPath(resolvedSource);
  const targetPath = options.dest || inferredPath;
  if (!targetPath) {
    throw new Error('Missing --dest and unable to infer plugin path under plugins/.');
  }
  if (!targetPath.startsWith('plugins/')) {
    throw new Error('Plugin destination must start with plugins/.');
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);
  const messageId = options['message-id'] ?? buildMessageId(runContext?.id, 'plugin-upload');

  const payload = {
    messageId,
    path: targetPath,
    content,
    overwrite: Boolean(options.overwrite),
  };

  const url = buildUrl(server, '/codebase/plugin');
  const response = await requestJson(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
    authHeader,
  );
  printJson(response);
  if (runContext) {
    recordRunEvent(runContext, {
      type: 'plugin-upload',
      source: resolvedSource,
      path: targetPath,
      overwrite: Boolean(options.overwrite),
      messageId,
      response,
    });
  }
}

async function handleStream(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('stream');
    return;
  }

  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  const streamInput = options.stream || 'simulation';
  const streamPath = resolveStreamPath(streamInput);
  const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
    ? streamPath
    : buildUrl(server, streamPath);

  if (subcommand === 'capture') {
    const format = (options.format || 'jsonl').toLowerCase();
    if (format !== 'jsonl' && format !== 'json') {
      throw new Error('Invalid --format value. Expected jsonl or json.');
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    if (!maxFrames && !durationMs) {
      throw new Error('Provide --frames or --duration to bound the capture.');
    }

    const componentId = options.component || '';
    const entityId = options.entity || '';
    const includeAcks = Boolean(options['include-acks']);

    const outputPath = resolveCapturePath(options.out, runContext, streamInput, format);
    const summary = await captureStream({
      url,
      outputPath,
      format,
      maxFrames,
      durationMs,
      componentId,
      entityId,
      includeAcks,
      authHeader,
    });

    console.log(`[capture] ${summary.recordCount} records saved to ${summary.outputPath}`);
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'capture',
        stream: streamInput,
        format,
        outputPath: summary.outputPath,
        recordCount: summary.recordCount,
        frameCount: summary.frameCount,
        ackCount: summary.ackCount,
        durationMs: summary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
        includeAcks,
      });
    }
    return;
  }

  if (subcommand === 'forward') {
    const uiInput = resolveUiInput(options, 'stream forward');
    if (!uiInput) {
      throw new Error('Provide --ui to forward stream data to the metrics UI.');
    }
    const uiUrl = await resolveUiWsUrl(uiInput);
    if (!uiUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }

    const foreground = parseBooleanOption(options.foreground, false) ||
      parseBooleanOption(options['no-background'], false);
    if (!foreground) {
      const logFile = resolveCliLogFile(options, 'stream_forward');
      const args = buildStreamForwardArgs({
        options,
        streamInput,
        uiUrl,
      });
      const pid = spawnDetachedProcess({
        command: process.execPath,
        args,
        cwd: process.cwd(),
        env: process.env,
        logFile,
      });
      printJson({
        status: 'started',
        pid,
        logFile,
        uiUrl,
        stream: streamInput,
      });
      return;
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    const componentId = options.component || '';
    const entityId = options.entity || '';
    const captureId = options['capture-id'] || buildCaptureId();
    const filename =
      options.name ||
      options.filename ||
      `${String(streamInput || 'stream').replace(/[^a-z0-9_-]+/gi, '_')}.jsonl`;

    const summary = await forwardStream({
      url,
      uiUrl,
      maxFrames,
      durationMs,
      componentId,
      entityId,
      authHeader,
      captureId,
      filename,
    });

    console.log(
      `[forward] ${summary.frameCount} frames sent to ${summary.uiUrl} as ${summary.captureId}`,
    );
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'forward',
        stream: streamInput,
        uiUrl: summary.uiUrl,
        captureId: summary.captureId,
        frameCount: summary.frameCount,
        durationMs: summary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
      });
    }
    return;
  }

  if (subcommand === 'upload') {
    const fileInput = options.file || options.source;
    if (!fileInput) {
      throw new Error('Provide --file to upload a capture to the metrics UI.');
    }
    const uiInput = resolveUiInput(options, 'stream upload');
    if (!uiInput) {
      throw new Error('Provide --ui to upload a capture to the metrics UI.');
    }

    const resolvedFile = path.resolve(process.cwd(), String(fileInput));
    if (!fs.existsSync(resolvedFile)) {
      throw new Error(`Capture file not found: ${resolvedFile}`);
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const componentId = options.component || '';
    const entityId = options.entity || '';
    const filename = options.name || options.filename || path.basename(resolvedFile);
    if (maxFrames || componentId || entityId) {
      throw new Error('stream upload does not support --frames/--component/--entity.');
    }
    if (options['capture-id']) {
      throw new Error('stream upload does not support --capture-id.');
    }

    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// URL for uploads.');
    }

    const summary = await uploadCaptureFileHttp({
      uiUrl: uiHttpUrl,
      filename,
      filePath: resolvedFile,
    });

    console.log(
      `[upload] ${summary.filename} registered at ${summary.uiUrl} as ${summary.captureId}`,
    );
    if (runContext) {
      recordRunCapture(runContext, {
        type: 'upload',
        filePath: resolvedFile,
        uiUrl: summary.uiUrl,
        captureId: summary.captureId,
        filename: summary.filename,
        size: summary.size ?? null,
      });
    }
    return;
  }

  throw new Error(`Unknown stream subcommand: ${subcommand}`);
}

async function handleUi(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('ui');
    return;
  }

  if (subcommand === 'serve') {
    await handleUiServe(options);
    return;
  }

  if (subcommand === 'shutdown') {
    await handleUiShutdown(options);
    return;
  }

  const uiInput = resolveUiInput(options, 'ui');
  if (!uiInput) {
    throw new Error('Provide --ui to connect to the metrics UI.');
  }

  if (subcommand === 'live-status') {
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// URL for live-status.');
    }
    const url = buildUrl(uiHttpUrl, '/api/live/status');
    const response = await requestJson(url, { method: 'GET' });
    printJson(response);
    return;
  }

  if (subcommand === 'derivation-plugin-upload') {
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// or ws:// URL for derivation-plugin-upload.');
    }
    const sourcePath = options.file || options.source;
    if (!sourcePath) {
      throw new Error('Provide --file (or --source) for ui derivation-plugin-upload.');
    }
    const resolvedSource = path.resolve(process.cwd(), String(sourcePath));
    if (!fs.existsSync(resolvedSource) || !fs.statSync(resolvedSource).isFile()) {
      throw new Error(`Plugin file not found: ${resolvedSource}`);
    }
    const uploadName = options.name ? String(options.name) : path.basename(resolvedSource);
    const fileBuffer = fs.readFileSync(resolvedSource);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), uploadName);
    const endpoint = buildUrl(uiHttpUrl, '/api/derivations/plugins/upload');
    const response = await fetch(endpoint, { method: 'POST', body: form });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `Plugin upload failed (${response.status}).`;
      throw new Error(message);
    }
    printJson(payload ?? { status: 'success' });
    return;
  }

  if (subcommand === 'derivation-plugin-source') {
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// or ws:// URL for derivation-plugin-source.');
    }
    const pluginId = options['plugin-id'] ?? options.pluginId;
    if (!pluginId) {
      throw new Error('Provide --plugin-id for ui derivation-plugin-source.');
    }
    const endpoint = buildUrl(
      uiHttpUrl,
      `/api/derivations/plugins/${encodeURIComponent(String(pluginId))}/source`,
    );
    const response = await requestJson(endpoint, { method: 'GET' });
    printJson(response);
    return;
  }

  if (subcommand === 'derivation-plugin-delete') {
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a http(s):// or ws:// URL for derivation-plugin-delete.');
    }
    const pluginId = options['plugin-id'] ?? options.pluginId;
    if (!pluginId) {
      throw new Error('Provide --plugin-id for ui derivation-plugin-delete.');
    }
    const endpoint = buildUrl(
      uiHttpUrl,
      `/api/derivations/plugins/${encodeURIComponent(String(pluginId))}`,
    );
    const response = await requestJson(endpoint, { method: 'DELETE' });
    printJson(response);
    return;
  }

  if (subcommand === 'verify') {
    const observeMs = parseOptionalNumber(options['observe-ms'], 'observe-ms') ?? 5000;
    const intervalMs = parseOptionalNumber(options.interval, 'interval') ?? 1000;
    const requireSelected = parseBooleanOption(options['require-selected'], true) !== false;
    const captureId = options['capture-id'];
    if (observeMs <= 0) {
      throw new Error('Invalid --observe-ms value. Expected a positive number.');
    }
    if (intervalMs <= 0) {
      throw new Error('Invalid --interval value. Expected a positive number.');
    }
    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }
    const autoServe = parseBooleanOption(options['auto-serve'], true) !== false;
    const shutdownOnExit = parseBooleanOption(options['shutdown-on-exit'], true) !== false;
    const lifecycle = await ensureUiServerForVerification({
      options,
      uiHttpUrl,
      requireWs: false,
      autoServe,
      shutdownOnExit,
    });
    let verify = null;
    let verifyError = null;
    let cleanupResult = null;
    try {
      verify = await collectUiServerVerifyReport(lifecycle.uiHttpUrl, {
        captureId: captureId ? String(captureId) : null,
        observeMs,
        intervalMs,
        requireSelected,
      });
    } catch (error) {
      verifyError = error;
    } finally {
      cleanupResult = await finalizeUiServerForVerification(lifecycle);
    }
    if (verifyError) {
      throw verifyError;
    }
    verify.report.server = {
      url: lifecycle.uiHttpUrl,
      autoServed: lifecycle.startedByVerifier,
      shutdownOnExit: lifecycle.shutdownOnExit,
      shutdownAttempted: cleanupResult?.attempted === true,
      shutdownResult: cleanupResult?.result || 'not-requested',
      shutdownError: cleanupResult?.error || null,
    };
    printJson(verify.report);
    if (verify.report.status !== 'ok') {
      process.exitCode = 1;
    }
    return;
  }

  if (subcommand === 'verify-regression') {
    const observeMs = parseOptionalNumber(options['observe-ms'], 'observe-ms') ?? 8000;
    const intervalMs = parseOptionalNumber(options.interval, 'interval') ?? 400;
    const pollMs = parseOptionalNumber(options['poll-ms'], 'poll-ms') ?? 120;
    const frames = parseOptionalNumber(options.frames, 'frames') ?? 24000;
    const requireSelected = parseBooleanOption(options['require-selected'], true) !== false;
    if (observeMs <= 0) {
      throw new Error('Invalid --observe-ms value. Expected a positive number.');
    }
    if (intervalMs <= 0) {
      throw new Error('Invalid --interval value. Expected a positive number.');
    }
    if (pollMs <= 0) {
      throw new Error('Invalid --poll-ms value. Expected a positive number.');
    }
    if (frames <= 10) {
      throw new Error('Invalid --frames value. Expected a number greater than 10.');
    }

    const uiHttpUrl = normalizeUiHttpUrl(uiInput);
    if (!uiHttpUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }
    const uiWsUrl = await resolveUiWsUrl(uiInput);
    if (!uiWsUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }
    const autoServe = parseBooleanOption(options['auto-serve'], true) !== false;
    const shutdownOnExit = parseBooleanOption(options['shutdown-on-exit'], true) !== false;
    const lifecycle = await ensureUiServerForVerification({
      options,
      uiHttpUrl,
      requireWs: true,
      autoServe,
      shutdownOnExit,
    });
    let verify = null;
    let verifyError = null;
    let cleanupResult = null;
    try {
      verify = await runUiRegressionVerify({
        uiHttpUrl: lifecycle.uiHttpUrl,
        uiWsUrl: lifecycle.uiWsUrl,
        observeMs,
        intervalMs,
        pollMs,
        frames,
        requireSelected,
        captureId: options['capture-id'] ? String(options['capture-id']) : null,
      });
    } catch (error) {
      verifyError = error;
    } finally {
      cleanupResult = await finalizeUiServerForVerification(lifecycle);
    }
    if (verifyError) {
      throw verifyError;
    }
    verify.report.server = {
      url: lifecycle.uiHttpUrl,
      autoServed: lifecycle.startedByVerifier,
      shutdownOnExit: lifecycle.shutdownOnExit,
      shutdownAttempted: cleanupResult?.attempted === true,
      shutdownResult: cleanupResult?.result || 'not-requested',
      shutdownError: cleanupResult?.error || null,
    };
    printJson(verify.report);
    if (verify.report.status !== 'ok') {
      process.exitCode = 1;
    }
    return;
  }

  const uiUrl = await resolveUiWsUrl(uiInput);
  if (!uiUrl) {
    throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
  }

  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });

  sendWsMessage(socket, { type: 'register', role: 'agent' });
  const registered = await waitForWsAck(socket);
  if (!registered) {
    socket.close();
    throw new Error('Failed to register with the UI WebSocket.');
  }

  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const requestId =
    (options['message-id'] ? String(options['message-id']) : null)
    || buildMessageId(null, `ui-${subcommand}`);

  try {
    if (subcommand === 'mode') {
      const mode = String(options.mode || '').toLowerCase();
      if (mode !== 'file' && mode !== 'live') {
        throw new Error('Provide --mode file|live for ui mode.');
      }
      sendWsMessage(socket, { type: 'set_source_mode', mode, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('mode', uiUrl, requestId, { mode });
      return;
    }

    if (subcommand === 'live-source') {
      const source = options.source || options.file || options.endpoint;
      if (!source) {
        throw new Error('Provide --source for ui live-source.');
      }
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'set_live_source',
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-source', uiUrl, requestId, {
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
      });
      return;
    }

    if (subcommand === 'live-start') {
      const source = options.source || options.file || options.endpoint;
      if (!source) {
        throw new Error('Provide --source for ui live-start.');
      }
      const pollIntervalMs = parseOptionalNumber(options['poll-ms'] ?? options.poll, 'poll-ms');
      const pollSeconds = parseOptionalNumber(options['poll-seconds'], 'poll-seconds');
      const captureId = options['capture-id'];
      const filename = options.filename || options.name;
      sendWsMessage(socket, {
        type: 'live_start',
        source: String(source),
        pollIntervalMs: pollIntervalMs ?? (pollSeconds ? Math.round(pollSeconds * 1000) : undefined),
        captureId: captureId ? String(captureId) : undefined,
        filename: filename ? String(filename) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs: timeoutMs + 2000,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-start', uiUrl, requestId, {
        source: String(source),
        captureId: captureId ? String(captureId) : undefined,
        filename: filename ? String(filename) : undefined,
        pollIntervalMs: pollIntervalMs ?? (pollSeconds ? Math.round(pollSeconds * 1000) : undefined),
      });
      return;
    }

    if (subcommand === 'live-stop') {
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'live_stop',
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('live-stop', uiUrl, requestId, {
        captureId: captureId ? String(captureId) : undefined,
      });
      return;
    }

    if (subcommand === 'select') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui select.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui select.');
      }
      sendWsMessage(socket, {
        type: 'select_metric',
        captureId: String(captureId),
        path,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('select', uiUrl, requestId, {
        captureId: String(captureId),
        path,
      });
      return;
    }

    if (subcommand === 'analysis-select') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui analysis-select.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui analysis-select.');
      }
      sendWsMessage(socket, {
        type: 'select_analysis_metric',
        captureId: String(captureId),
        path,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-select', uiUrl, requestId, {
        captureId: String(captureId),
        path,
      });
      return;
    }

    if (subcommand === 'remove-capture') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui remove-capture.');
      }
      sendWsMessage(socket, {
        type: 'remove_capture',
        captureId: String(captureId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('remove-capture', uiUrl, requestId, {
        captureId: String(captureId),
      });
      return;
    }

    if (subcommand === 'deselect') {
      const captureId = options['capture-id'];
      const fullPath = options['full-path'] || options.fullPath;
      if (!captureId || !fullPath) {
        throw new Error('Provide --capture-id and --full-path for ui deselect.');
      }
      sendWsMessage(socket, {
        type: 'deselect_metric',
        captureId: String(captureId),
        fullPath: String(fullPath),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('deselect', uiUrl, requestId, {
        captureId: String(captureId),
        fullPath: String(fullPath),
      });
      return;
    }

    if (subcommand === 'metric-axis') {
      const captureId = options['capture-id'];
      const path = parsePathInput(options.path ?? options['path-json']);
      const fullPath = options['full-path'] || options.fullPath || (path ? path.join('.') : null);
      if (!captureId || !fullPath) {
        throw new Error('Provide --capture-id and --full-path (or --path) for ui metric-axis.');
      }
      const axisRaw = String(options.axis ?? '').trim().toLowerCase();
      if (axisRaw !== 'y1' && axisRaw !== 'y2') {
        throw new Error('Provide --axis y1|y2 for ui metric-axis.');
      }
      sendWsMessage(socket, {
        type: 'set_metric_axis',
        captureId: String(captureId),
        fullPath: String(fullPath),
        axis: axisRaw,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('metric-axis', uiUrl, requestId, {
        captureId: String(captureId),
        fullPath: String(fullPath),
        axis: axisRaw,
      });
      return;
    }

    if (subcommand === 'analysis-deselect') {
      const captureId = options['capture-id'];
      const path = parsePathInput(options.path ?? options['path-json']);
      const fullPath = options['full-path'] || options.fullPath || (path ? path.join('.') : null);
      if (!captureId || !fullPath) {
        throw new Error('Provide --capture-id and --full-path (or --path) for ui analysis-deselect.');
      }
      sendWsMessage(socket, {
        type: 'deselect_analysis_metric',
        captureId: String(captureId),
        fullPath: String(fullPath),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-deselect', uiUrl, requestId, {
        captureId: String(captureId),
        fullPath: String(fullPath),
      });
      return;
    }

    if (subcommand === 'clear') {
      sendWsMessage(socket, { type: 'clear_selection', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('clear', uiUrl, requestId);
      return;
    }

    if (subcommand === 'analysis-clear') {
      sendWsMessage(socket, { type: 'clear_analysis_metrics', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('analysis-clear', uiUrl, requestId);
      return;
    }

    if (subcommand === 'derivation-group-create') {
      const groupId = options['group-id'] || options.groupId || options.id;
      const name = options.name;
      sendWsMessage(socket, {
        type: 'create_derivation_group',
        groupId: groupId ? String(groupId) : undefined,
        name: name ? String(name) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-create', uiUrl, requestId, {
        groupId: groupId ? String(groupId) : undefined,
        name: name ? String(name) : undefined,
      });
      return;
    }

    if (subcommand === 'derivation-group-delete') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-delete.');
      }
      sendWsMessage(socket, {
        type: 'delete_derivation_group',
        groupId: String(groupId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-delete', uiUrl, requestId, { groupId: String(groupId) });
      return;
    }

    if (subcommand === 'derivation-group-active') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-active.');
      }
      sendWsMessage(socket, {
        type: 'set_active_derivation_group',
        groupId: String(groupId),
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-active', uiUrl, requestId, { groupId: String(groupId) });
      return;
    }

    if (subcommand === 'derivation-group-update') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-update.');
      }
      const newGroupId = options['new-group-id'] || options.newGroupId || options['new-id'];
      const name = options.name;
      if (!newGroupId && !name) {
        throw new Error('Provide --new-group-id and/or --name for ui derivation-group-update.');
      }
      sendWsMessage(socket, {
        type: 'update_derivation_group',
        groupId: String(groupId),
        newGroupId: newGroupId ? String(newGroupId) : undefined,
        name: name ? String(name) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-update', uiUrl, requestId, {
        groupId: String(groupId),
        newGroupId: newGroupId ? String(newGroupId) : undefined,
        name: name ? String(name) : undefined,
      });
      return;
    }

    if (subcommand === 'derivation-group-display') {
      const groupId = options['group-id'] || options.groupId || options.id;
      sendWsMessage(socket, {
        type: 'set_display_derivation_group',
        groupId: groupId ? String(groupId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-display', uiUrl, requestId, {
        groupId: groupId ? String(groupId) : '',
      });
      return;
    }

    if (subcommand === 'derivation-group-reorder') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-group-reorder.');
      }
      const fromIndex = parseOptionalInteger(
        options['from-index'] ?? options.from,
        'from-index',
        { min: 0 },
      );
      const toIndex = parseOptionalInteger(
        options['to-index'] ?? options.to,
        'to-index',
        { min: 0 },
      );
      if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) {
        throw new Error('Provide --from-index and --to-index for ui derivation-group-reorder.');
      }
      sendWsMessage(socket, {
        type: 'reorder_derivation_group_metrics',
        groupId: String(groupId),
        fromIndex,
        toIndex,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('derivation-group-reorder', uiUrl, requestId, {
        groupId: String(groupId),
        fromIndex,
        toIndex,
      });
      return;
    }

    if (subcommand === 'derivation-run') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-run.');
      }
      const rawKind = String(options.kind ?? '').trim().toLowerCase();
      if (rawKind !== 'diff' && rawKind !== 'moving_average') {
        throw new Error('Provide --kind diff|moving_average for ui derivation-run.');
      }
      const window = parseOptionalInteger(options.window, 'window', { min: 1 });
      const inputIndex = parseOptionalInteger(options['input-index'], 'input-index', { min: 0 });
      const leftIndex = parseOptionalInteger(options['left-index'], 'left-index', { min: 0 });
      const rightIndex = parseOptionalInteger(options['right-index'], 'right-index', { min: 0 });
      const outputCaptureId =
        options['output-capture-id'] ?? options['capture-output-id'] ?? options.outputCaptureId;
      const waitComplete = parseBooleanOption(
        options['wait-complete'] ?? options.waitComplete,
        false,
      );
      const waitCompleteTimeoutMs =
        parseOptionalNumber(
          options['wait-complete-timeout'] ?? options['wait-timeout'],
          'wait-complete-timeout',
        ) ?? Math.max(timeoutMs, 30000);
      sendWsMessage(socket, {
        type: 'run_derivation',
        kind: rawKind,
        groupId: String(groupId),
        window: Number.isFinite(window) ? window : undefined,
        inputIndex: Number.isFinite(inputIndex) ? inputIndex : undefined,
        leftIndex: Number.isFinite(leftIndex) ? leftIndex : undefined,
        rightIndex: Number.isFinite(rightIndex) ? rightIndex : undefined,
        outputCaptureId: outputCaptureId ? String(outputCaptureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      const successPayload = {
        kind: rawKind,
        groupId: String(groupId),
        window: Number.isFinite(window) ? window : undefined,
        inputIndex: Number.isFinite(inputIndex) ? inputIndex : undefined,
        leftIndex: Number.isFinite(leftIndex) ? leftIndex : undefined,
        rightIndex: Number.isFinite(rightIndex) ? rightIndex : undefined,
        outputCaptureId: outputCaptureId ? String(outputCaptureId) : undefined,
      };
      if (!waitComplete) {
        printUiSuccess('derivation-run', uiUrl, requestId, successPayload);
        return;
      }
      const completion = await waitForDerivationCompletionOrThrow(socket, {
        requestId,
        timeoutMs: waitCompleteTimeoutMs,
        actionLabel: 'derivation run',
      });
      printUiSuccess('derivation-run', uiUrl, requestId, {
        ...successPayload,
        waitComplete: true,
        completionType: completion.type,
        completion: completion.payload ?? null,
      });
      return;
    }

    if (subcommand === 'derivation-plugins') {
      sendWsMessage(socket, { type: 'get_derivation_plugins', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['derivation_plugins'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for derivation plugin list.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'derivation-plugin-run') {
      const groupId = options['group-id'] || options.groupId || options.id;
      if (!groupId) {
        throw new Error('Provide --group-id for ui derivation-plugin-run.');
      }
      const pluginId = options['plugin-id'] ?? options.pluginId;
      if (!pluginId) {
        throw new Error('Provide --plugin-id for ui derivation-plugin-run.');
      }
      const outputCaptureId =
        options['output-capture-id'] ?? options['capture-output-id'] ?? options.outputCaptureId;
      const params = parseOptionalJson(
        options.params ?? options['params-json'],
        'params',
      );
      const waitComplete = parseBooleanOption(
        options['wait-complete'] ?? options.waitComplete,
        false,
      );
      const waitCompleteTimeoutMs =
        parseOptionalNumber(
          options['wait-complete-timeout'] ?? options['wait-timeout'],
          'wait-complete-timeout',
        ) ?? Math.max(timeoutMs, 30000);
      sendWsMessage(socket, {
        type: 'run_derivation_plugin',
        groupId: String(groupId),
        pluginId: String(pluginId),
        params: params ?? undefined,
        outputCaptureId: outputCaptureId ? String(outputCaptureId) : undefined,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      const successPayload = {
        groupId: String(groupId),
        pluginId: String(pluginId),
        outputCaptureId: outputCaptureId ? String(outputCaptureId) : undefined,
        params: params ?? undefined,
      };
      if (!waitComplete) {
        printUiSuccess('derivation-plugin-run', uiUrl, requestId, successPayload);
        return;
      }
      const completion = await waitForDerivationCompletionOrThrow(socket, {
        requestId,
        timeoutMs: waitCompleteTimeoutMs,
        actionLabel: 'derivation plugin run',
      });
      printUiSuccess('derivation-plugin-run', uiUrl, requestId, {
        ...successPayload,
        waitComplete: true,
        completionType: completion.type,
        completion: completion.payload ?? null,
      });
      return;
    }

    if (subcommand === 'clear-captures') {
      sendWsMessage(socket, { type: 'clear_captures', request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('clear-captures', uiUrl, requestId);
      return;
    }

    if (subcommand === 'play' || subcommand === 'pause' || subcommand === 'stop') {
      sendWsMessage(socket, { type: subcommand, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess(subcommand, uiUrl, requestId);
      return;
    }

    if (subcommand === 'seek') {
      const tick = Number(options.tick);
      if (!Number.isFinite(tick)) {
        throw new Error('Provide --tick for ui seek.');
      }
      sendWsMessage(socket, { type: 'seek', tick, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('seek', uiUrl, requestId, { tick });
      return;
    }

    if (subcommand === 'speed') {
      const speed = Number(options.speed);
      if (!Number.isFinite(speed) || speed <= 0) {
        throw new Error('Provide --speed for ui speed.');
      }
      sendWsMessage(socket, { type: 'set_speed', speed, request_id: requestId });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('speed', uiUrl, requestId, { speed });
      return;
    }

    if (subcommand === 'window-size') {
      const windowSize = parseOptionalNumber(options['window-size'] ?? options.size, 'window-size');
      if (!Number.isFinite(windowSize) || windowSize <= 0) {
        throw new Error('Provide --window-size for ui window-size.');
      }
      sendWsMessage(socket, {
        type: 'set_window_size',
        windowSize,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-start') {
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      if (!Number.isFinite(windowStart) || windowStart <= 0) {
        throw new Error('Provide --window-start for ui window-start.');
      }
      sendWsMessage(socket, {
        type: 'set_window_start',
        windowStart,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-end') {
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      if (!Number.isFinite(windowEnd) || windowEnd <= 0) {
        throw new Error('Provide --window-end for ui window-end.');
      }
      sendWsMessage(socket, {
        type: 'set_window_end',
        windowEnd,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'window-range') {
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      if (!Number.isFinite(windowStart) || !Number.isFinite(windowEnd)) {
        throw new Error('Provide --window-start and --window-end for ui window-range.');
      }
      sendWsMessage(socket, {
        type: 'set_window_range',
        windowStart,
        windowEnd,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'y-range') {
      const min = Number(options.min);
      const max = Number(options.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        throw new Error('Provide --min and --max for ui y-range with max > min.');
      }
      sendWsMessage(socket, {
        type: 'set_y_range',
        min,
        max,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('y-range', uiUrl, requestId, { min, max });
      return;
    }

    if (subcommand === 'y2-range') {
      const min = Number(options.min);
      const max = Number(options.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
        throw new Error('Provide --min and --max for ui y2-range with max > min.');
      }
      sendWsMessage(socket, {
        type: 'set_y2_range',
        min,
        max,
        request_id: requestId,
      });
      await waitForUiAckOrThrow(socket, {
        requestId,
        timeoutMs,
        errorMessage: 'Timed out waiting for UI ack.',
      });
      printUiSuccess('y2-range', uiUrl, requestId, { min, max });
      return;
    }

    if (subcommand === 'auto-scroll') {
      const rawValue = options.enabled;
      if (rawValue === undefined) {
        throw new Error('Provide --enabled true|false for ui auto-scroll.');
      }
      const enabled = parseBooleanOption(rawValue, undefined);
      if (typeof enabled !== 'boolean') {
        throw new Error('Invalid --enabled value. Use true or false.');
      }
      sendWsMessage(socket, {
        type: 'set_auto_scroll',
        enabled,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'fullscreen') {
      const rawValue = options.enabled;
      if (rawValue === undefined) {
        throw new Error('Provide --enabled true|false for ui fullscreen.');
      }
      const enabled = parseBooleanOption(rawValue, undefined);
      if (typeof enabled !== 'boolean') {
        throw new Error('Invalid --enabled value. Use true or false.');
      }
      sendWsMessage(socket, {
        type: 'set_fullscreen',
        enabled,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'add-annotation') {
      const tick = parseOptionalNumber(options.tick, 'tick');
      if (!Number.isFinite(tick) || tick <= 0) {
        throw new Error('Provide --tick for ui add-annotation.');
      }
      const annotationId = options['annotation-id'] ?? options.id;
      const label = options.label;
      const color = options.color;
      sendWsMessage(socket, {
        type: 'add_annotation',
        tick,
        id: annotationId ? String(annotationId) : undefined,
        label: label ? String(label) : undefined,
        color: color ? String(color) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'remove-annotation') {
      const annotationId = options['annotation-id'] ?? options.id;
      const tick = parseOptionalNumber(options.tick, 'tick');
      if (!annotationId && !Number.isFinite(tick)) {
        throw new Error('Provide --annotation-id or --tick for ui remove-annotation.');
      }
      sendWsMessage(socket, {
        type: 'remove_annotation',
        id: annotationId ? String(annotationId) : undefined,
        tick: Number.isFinite(tick) ? tick : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'clear-annotations') {
      sendWsMessage(socket, { type: 'clear_annotations', request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'jump-annotation') {
      const direction = String(options.direction || '').toLowerCase();
      if (direction !== 'next' && direction !== 'previous') {
        throw new Error('Provide --direction next|previous for ui jump-annotation.');
      }
      sendWsMessage(socket, { type: 'jump_annotation', direction, request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'add-subtitle') {
      const startTick = parseOptionalNumber(options['start-tick'], 'start-tick');
      const endTick = parseOptionalNumber(options['end-tick'], 'end-tick');
      if (!Number.isFinite(startTick) || !Number.isFinite(endTick)) {
        throw new Error('Provide --start-tick and --end-tick for ui add-subtitle.');
      }
      const text = options.text || options.label;
      if (!text) {
        throw new Error('Provide --text for ui add-subtitle.');
      }
      const subtitleId = options['subtitle-id'] ?? options.id;
      const color = options.color;
      sendWsMessage(socket, {
        type: 'add_subtitle',
        startTick,
        endTick,
        text: String(text),
        id: subtitleId ? String(subtitleId) : undefined,
        color: color ? String(color) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'remove-subtitle') {
      const subtitleId = options['subtitle-id'] ?? options.id;
      const startTick = parseOptionalNumber(options['start-tick'], 'start-tick');
      const endTick = parseOptionalNumber(options['end-tick'], 'end-tick');
      const text = options.text || options.label;
      if (!subtitleId && !Number.isFinite(startTick) && !Number.isFinite(endTick) && !text) {
        throw new Error('Provide --subtitle-id, --start-tick/--end-tick, or --text for ui remove-subtitle.');
      }
      sendWsMessage(socket, {
        type: 'remove_subtitle',
        id: subtitleId ? String(subtitleId) : undefined,
        startTick: Number.isFinite(startTick) ? startTick : undefined,
        endTick: Number.isFinite(endTick) ? endTick : undefined,
        text: text ? String(text) : undefined,
        request_id: requestId,
      });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'clear-subtitles') {
      sendWsMessage(socket, { type: 'clear_subtitles', request_id: requestId });
      const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
      if (!ack) {
        throw new Error('Timed out waiting for UI ack.');
      }
      return;
    }

    if (subcommand === 'state') {
      sendWsMessage(socket, { type: 'get_state', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['state_update'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI state.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'components') {
      const captureId = options['capture-id'];
      const search = options.search;
      const limit = parseOptionalNumber(options.limit, 'limit');
      sendWsMessage(socket, {
        type: 'query_components',
        captureId: captureId ? String(captureId) : undefined,
        search: search ? String(search) : undefined,
        limit: limit ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['components_list'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI components.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'display-snapshot') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_display_snapshot',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['display_snapshot'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI display snapshot.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'series-window') {
      const captureId = options['capture-id'];
      if (!captureId) {
        throw new Error('Provide --capture-id for ui series-window.');
      }
      const path = parsePathInput(options.path ?? options['path-json']);
      if (!path || path.length === 0) {
        throw new Error('Provide --path (JSON array recommended) for ui series-window.');
      }
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_series_window',
        captureId: String(captureId),
        path,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['series_window'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI series window.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'render-table') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      sendWsMessage(socket, {
        type: 'get_render_table',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['render_table'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI render table.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'render-debug') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      sendWsMessage(socket, {
        type: 'get_render_debug',
        captureId: captureId ? String(captureId) : undefined,
        windowSize: windowSize ?? undefined,
        windowStart: windowStart ?? undefined,
        windowEnd: windowEnd ?? undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['render_debug'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI render debug.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'debug') {
      sendWsMessage(socket, { type: 'get_ui_debug', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['ui_debug'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI debug.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'check') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      const check = await collectUiCheckReport(socket, {
        captureId: captureId ? String(captureId) : null,
        windowSize,
        windowStart,
        windowEnd,
        timeoutMs,
        requestIdBase: requestId,
      });
      printJson(check.report);
      return;
    }

    if (subcommand === 'verify-flow') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      const observeMs = parseOptionalNumber(options['observe-ms'], 'observe-ms') ?? 12000;
      const intervalMs = parseOptionalNumber(options.interval, 'interval') ?? 1000;
      const requireSelected = parseBooleanOption(options['require-selected'], true) !== false;
      if (observeMs <= 0) {
        throw new Error('Invalid --observe-ms value. Expected a positive number.');
      }
      if (intervalMs <= 0) {
        throw new Error('Invalid --interval value. Expected a positive number.');
      }

      const baselineCheck = await collectUiCheckReport(socket, {
        captureId: captureId ? String(captureId) : null,
        windowSize,
        windowStart,
        windowEnd,
        timeoutMs,
        requestIdBase: `${requestId}-baseline-check`,
      });
      const baselineDebug = await collectUiDebugSnapshot(socket, {
        timeoutMs,
        requestIdBase: `${requestId}-baseline-debug`,
      });

      const selectedMetrics = Array.isArray(baselineCheck.selectedMetrics)
        ? baselineCheck.selectedMetrics.filter((metric) => (
          metric
          && typeof metric.captureId === 'string'
          && typeof metric.fullPath === 'string'
          && metric.fullPath.length > 0
        ))
        : [];

      const selectedCaptureIds = Array.from(
        new Set(selectedMetrics.map((metric) => String(metric.captureId))),
      );
      const candidateCaptureIds = captureId
        ? [String(captureId)]
        : (selectedCaptureIds.length > 0
          ? selectedCaptureIds
          : baselineCheck.report.captures.map((entry) => String(entry.captureId)));

      const liveStreams = Array.isArray(baselineDebug?.state?.liveStreams)
        ? baselineDebug.state.liveStreams
        : [];
      const liveSourceByCapture = new Map();
      liveStreams.forEach((entry) => {
        if (!entry || typeof entry.id !== 'string') {
          return;
        }
        liveSourceByCapture.set(String(entry.id), {
          source: typeof entry.source === 'string' ? entry.source : '',
          filename: typeof entry.filename === 'string' ? entry.filename : undefined,
          pollIntervalMs:
            Number.isFinite(Number(entry.pollIntervalMs)) && Number(entry.pollIntervalMs) > 0
              ? Number(entry.pollIntervalMs)
              : undefined,
        });
      });

      const setupIssues = [];
      const actions = [];
      const targets = [];

      for (const id of candidateCaptureIds) {
        if (!id) {
          continue;
        }
        const sourceEntry = liveSourceByCapture.get(id);
        if (!sourceEntry || !sourceEntry.source) {
          setupIssues.push({
            type: 'verify-flow-missing-source',
            captureId: id,
            message: `No live source recorded for capture ${id}.`,
          });
          continue;
        }

        const removeRequestId = `${requestId}-remove-${id}`;
        sendWsMessage(socket, {
          type: 'remove_capture',
          captureId: id,
          request_id: removeRequestId,
        });
        await waitForUiAckOrThrow(socket, {
          requestId: removeRequestId,
          timeoutMs,
          errorMessage: `Timed out removing capture ${id} for verify-flow.`,
        });
        actions.push({
          type: 'remove_capture',
          captureId: id,
        });

        const restartRequestId = `${requestId}-restart-${id}`;
        sendWsMessage(socket, {
          type: 'live_start',
          source: sourceEntry.source,
          captureId: id,
          filename: sourceEntry.filename,
          pollIntervalMs: sourceEntry.pollIntervalMs,
          request_id: restartRequestId,
        });
        await waitForUiAckOrThrow(socket, {
          requestId: restartRequestId,
          timeoutMs: timeoutMs + 3000,
          errorMessage: `Timed out restarting capture ${id} for verify-flow.`,
        });
        actions.push({
          type: 'live_start',
          captureId: id,
          source: sourceEntry.source,
        });
        targets.push(id);
      }

      if (targets.length === 0) {
        setupIssues.push({
          type: 'verify-flow-no-targets',
          message: captureId
            ? `Unable to verify capture ${captureId}; no restartable source found.`
            : 'No restartable captures found for verify-flow.',
        });
      }

      const byCaptureMetric = new Map();
      selectedMetrics.forEach((metric) => {
        const id = String(metric.captureId || '');
        if (!id || byCaptureMetric.has(id)) {
          return;
        }
        byCaptureMetric.set(id, metric);
      });

      for (const id of targets) {
        const metric = byCaptureMetric.get(id);
        if (!metric) {
          if (requireSelected) {
            setupIssues.push({
              type: 'verify-flow-missing-selected-metric',
              captureId: id,
              message: `No selected metric found for capture ${id}.`,
            });
          }
          continue;
        }
        const fullPath = String(metric.fullPath || '');
        const metricPath =
          Array.isArray(metric.path) && metric.path.length > 0
            ? metric.path.map((part) => String(part))
            : (fullPath ? fullPath.split('.') : []);

        if (!fullPath || metricPath.length === 0) {
          setupIssues.push({
            type: 'verify-flow-invalid-metric-path',
            captureId: id,
            fullPath,
            message: `Unable to parse metric path for ${id}::${fullPath || '<unknown>'}.`,
          });
          continue;
        }

        const deselectRequestId = `${requestId}-deselect-${id}`;
        sendWsMessage(socket, {
          type: 'deselect_metric',
          captureId: id,
          fullPath,
          request_id: deselectRequestId,
        });
        await waitForUiAckOrThrow(socket, {
          requestId: deselectRequestId,
          timeoutMs,
          errorMessage: `Timed out deselecting metric ${id}::${fullPath}.`,
        });
        actions.push({
          type: 'deselect_metric',
          captureId: id,
          fullPath,
        });

        const selectRequestId = `${requestId}-select-${id}`;
        sendWsMessage(socket, {
          type: 'select_metric',
          captureId: id,
          path: metricPath,
          request_id: selectRequestId,
        });
        await waitForUiAckOrThrow(socket, {
          requestId: selectRequestId,
          timeoutMs,
          errorMessage: `Timed out reselecting metric ${id}::${fullPath}.`,
        });
        actions.push({
          type: 'select_metric',
          captureId: id,
          fullPath,
        });
      }

      if (actions.length > 0) {
        await delay(300);
      }

      const verify = await collectUiVerifyReport(socket, {
        captureId: captureId ? String(captureId) : null,
        windowSize,
        windowStart,
        windowEnd,
        timeoutMs,
        requestIdBase: `${requestId}-verify-flow`,
        observeMs,
        intervalMs,
        requireSelected,
        allowResetsForCaptures: targets,
      });

      const flowIssues = [];
      targets.forEach((id) => {
        const baselineSummary = baselineCheck.report.captures.find((entry) => entry.captureId === id);
        const baselineTick = Number(baselineSummary?.tickCount) || 0;
        const tickSamples = verify.report.samples
          .map((sample) => {
            const captures = Array.isArray(sample?.captures) ? sample.captures : [];
            const captureSample = captures.find((entry) => entry.captureId === id);
            return Number(captureSample?.tickCount);
          })
          .filter((value) => Number.isFinite(value));
        if (tickSamples.length === 0) {
          flowIssues.push({
            type: 'verify-flow-no-samples',
            captureId: id,
            message: `No tick samples observed for capture ${id}.`,
          });
          return;
        }
        const minTick = Math.min(...tickSamples);
        const maxTick = Math.max(...tickSamples);
        const resetThreshold = baselineTick > 0 ? Math.max(5, Math.floor(baselineTick * 0.25)) : 0;
        const sawReset = baselineTick > 0 ? minTick <= resetThreshold : true;
        const sawGrowth = maxTick > 0;
        if (!sawReset || !sawGrowth) {
          flowIssues.push({
            type: 'verify-flow-not-exercised',
            captureId: id,
            baselineTick,
            minTick,
            maxTick,
            message: `Capture ${id} did not show reset+growth during verify-flow.`,
          });
        }
      });

      if (setupIssues.length > 0 || flowIssues.length > 0) {
        verify.report.failures = [...verify.report.failures, ...setupIssues, ...flowIssues];
        verify.report.status = 'failed';
      }

      verify.report.mode = 'verify-flow';
      verify.report.actions = actions;
      verify.report.targets = targets;
      verify.report.baseline = {
        checkedAt: baselineCheck.report.checkedAt,
        captures: baselineCheck.report.captures,
        selectedMetricCount: selectedMetrics.length,
      };

      printJson(verify.report);
      if (verify.report.status !== 'ok') {
        process.exitCode = 1;
      }
      return;
    }

    if (subcommand === 'doctor') {
      const captureId = options['capture-id'];
      const windowSize = parseOptionalNumber(options['window-size'], 'window-size');
      const windowStart = parseOptionalNumber(options['window-start'], 'window-start');
      const windowEnd = parseOptionalNumber(options['window-end'], 'window-end');
      const shouldFix = parseBooleanOption(options.fix ?? options.apply, false) === true;

      const before = await collectUiCheckReport(socket, {
        captureId: captureId ? String(captureId) : null,
        windowSize,
        windowStart,
        windowEnd,
        timeoutMs,
        requestIdBase: `${requestId}-before`,
      });

      const actions = [];
      let after = null;

      if (shouldFix) {
        const removeCaptureIds = new Set();
        const deselectEntries = [];
        const nullOnlyCaptureIds = new Set();

        before.report.issues.forEach((issue) => {
          if (
            issue.type === 'no-records-for-selected-metrics'
            || issue.type === 'record-count-exceeds-tick-count'
            || issue.type === 'duplicate-ticks'
          ) {
            if (issue.captureId) {
              removeCaptureIds.add(String(issue.captureId));
            }
          }
          if (issue.type === 'null-ticks' && issue.captureId && Array.isArray(issue.ranges)) {
            const fullyNullInWindow = issue.ranges.some((range) => (
              Array.isArray(range)
              && typeof range[0] === 'number'
              && typeof range[1] === 'number'
              && range[0] <= before.report.windowStart
              && range[1] >= before.report.windowEnd
            ));
            if (fullyNullInWindow) {
              nullOnlyCaptureIds.add(String(issue.captureId));
            }
          }
        });

        before.selectedMetrics.forEach((metric) => {
          if (!metric || typeof metric !== 'object') {
            return;
          }
          const metricCaptureId = String(metric.captureId ?? '');
          if (!metricCaptureId) {
            return;
          }
          const summary = before.report.captures.find((entry) => entry.captureId === metricCaptureId);
          if (summary && summary.recordCount === 0) {
            deselectEntries.push({
              captureId: metricCaptureId,
              fullPath: String(metric.fullPath ?? ''),
            });
            return;
          }
          if (nullOnlyCaptureIds.has(metricCaptureId)) {
            deselectEntries.push({
              captureId: metricCaptureId,
              fullPath: String(metric.fullPath ?? ''),
            });
          }
        });

        for (const removeId of removeCaptureIds) {
          const fixRequestId = buildMessageId(null, `ui-doctor-remove-${removeId}`);
          sendWsMessage(socket, {
            type: 'remove_capture',
            captureId: removeId,
            request_id: fixRequestId,
          });
          await waitForUiAckOrThrow(socket, {
            requestId: fixRequestId,
            timeoutMs,
            errorMessage: `Timed out removing capture ${removeId}.`,
          });
          actions.push({
            type: 'remove_capture',
            captureId: removeId,
          });
        }

        const seenDeselect = new Set();
        for (const entry of deselectEntries) {
          if (!entry.fullPath) {
            continue;
          }
          const dedupeKey = `${entry.captureId}::${entry.fullPath}`;
          if (seenDeselect.has(dedupeKey)) {
            continue;
          }
          seenDeselect.add(dedupeKey);
          const fixRequestId = buildMessageId(
            null,
            `ui-doctor-deselect-${entry.captureId}-${entry.fullPath}`,
          );
          sendWsMessage(socket, {
            type: 'deselect_metric',
            captureId: entry.captureId,
            fullPath: entry.fullPath,
            request_id: fixRequestId,
          });
          await waitForUiAckOrThrow(socket, {
            requestId: fixRequestId,
            timeoutMs,
            errorMessage: `Timed out deselecting metric ${entry.captureId}::${entry.fullPath}.`,
          });
          actions.push({
            type: 'deselect_metric',
            captureId: entry.captureId,
            fullPath: entry.fullPath,
          });
        }

        after = await collectUiCheckReport(socket, {
          captureId: captureId ? String(captureId) : null,
          windowSize,
          windowStart,
          windowEnd,
          timeoutMs,
          requestIdBase: `${requestId}-after`,
        });
      }

      printJson({
        status: shouldFix
          ? (after?.report.status ?? 'unknown')
          : before.report.status,
        checkedAt: new Date().toISOString(),
        fixed: shouldFix,
        actionCount: actions.length,
        actions,
        before: before.report,
        after: after ? after.report : undefined,
      });
      return;
    }

    if (subcommand === 'memory-stats') {
      sendWsMessage(socket, { type: 'get_memory_stats', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['memory_stats'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI memory stats.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'metric-coverage') {
      const captureId = options['capture-id'];
      sendWsMessage(socket, {
        type: 'get_metric_coverage',
        captureId: captureId ? String(captureId) : undefined,
        request_id: requestId,
      });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['metric_coverage'],
        timeoutMs: timeoutMs + 2000,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI metric coverage.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'capabilities') {
      sendWsMessage(socket, { type: 'hello', request_id: requestId });
      const response = await waitForWsResponse(socket, {
        requestId,
        types: ['capabilities'],
        timeoutMs,
      });
      if (!response) {
        throw new Error('Timed out waiting for UI capabilities.');
      }
      printJson(response.payload ?? response);
      return;
    }

    if (subcommand === 'trace') {
      const traceRequestId =
        options['request-id']
        || options.requestId
        || options.id
        || options['message-id'];
      if (!traceRequestId) {
        throw new Error('Provide --request-id (or --message-id) for ui trace.');
      }
      const sendCommandRaw = options.send ?? options.command;
      const sendCommand =
        sendCommandRaw === undefined
          ? null
          : parseOptionalJson(sendCommandRaw, 'send');
      if (sendCommand !== null) {
        if (!sendCommand || typeof sendCommand !== 'object' || Array.isArray(sendCommand)) {
          throw new Error('Provide --send as a JSON object command, e.g. {\"type\":\"run_derivation_plugin\",...}.');
        }
        if (!sendCommand.type || typeof sendCommand.type !== 'string') {
          throw new Error('Trace --send JSON must include a string \"type\" field.');
        }
      }
      const includeAck = parseBooleanOption(
        options['include-ack'] ?? options.includeAck,
        true,
      );
      const traceTimeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 30000;
      const trace = await traceUiRequest(socket, {
        requestId: String(traceRequestId),
        timeoutMs: traceTimeoutMs,
        includeAck,
        sendCommand,
      });
      printJson(trace);
      return;
    }

    throw new Error(`Unknown ui subcommand: ${subcommand}`);
  } finally {
    if (!socketClosed) {
      socket.close();
    }
  }
}

async function handleUiServe(options) {
  const uiOptions = resolveUiServeOptions(options);
  const probe = await probeUiServer({
    host: uiOptions.host,
    port: uiOptions.port,
    timeoutMs: uiOptions.timeoutMs,
  });

  if (probe.running) {
    if (!probe.isUi) {
      throw new Error(
        `Port ${uiOptions.port} is in use but does not look like the Metrics UI.`,
      );
    }
    const uiStateFile = resolveUiStateFile(options);
    const uiState = loadUiState(uiStateFile);
    const key = buildUiKey(uiOptions.host, uiOptions.port);
    const existing = uiState.deployments[key];
    const existingPid = Number(existing?.pid);
    const pid = Number.isFinite(existingPid) && isProcessAlive(existingPid) ? existingPid : null;
    uiState.deployments[key] = {
      key,
      host: uiOptions.host,
      port: uiOptions.port,
      url: probe.url,
      pid,
      uiDir: existing?.uiDir ?? uiOptions.uiDir ?? null,
      mode: existing?.mode ?? uiOptions.mode ?? null,
      logFile: existing?.logFile ?? null,
      startedAt: existing?.startedAt ?? null,
      discoveredAt: new Date().toISOString(),
    };
    saveUiState(uiStateFile, uiState);
    printJson({
      status: 'running',
      url: probe.url,
      pid,
      stateFile: uiStateFile,
    });
    return;
  }

  await ensureUiDependencies(uiOptions.uiDir, uiOptions.skipInstall);

  const logFile = resolveCliLogFile(options, 'ui');
  const url = `http://${uiOptions.host}:${uiOptions.port}`;
  console.log(`[ui] starting Metrics UI (${uiOptions.mode}) at ${url}`);

  const env = {
    ...process.env,
    HOST: uiOptions.host,
    PORT: String(uiOptions.port),
  };
  const script = uiOptions.mode === 'start' ? 'start' : 'dev';
  const pid = spawnDetachedProcess({
    command: 'npm',
    args: ['--prefix', uiOptions.uiDir, 'run', script],
    cwd: uiOptions.uiDir,
    env,
    logFile,
  });
  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const key = buildUiKey(uiOptions.host, uiOptions.port);
  uiState.deployments[key] = {
    key,
    host: uiOptions.host,
    port: uiOptions.port,
    url,
    pid,
    uiDir: uiOptions.uiDir,
    mode: uiOptions.mode,
    logFile,
    startedAt: new Date().toISOString(),
  };
  saveUiState(uiStateFile, uiState);
  printJson({
    status: 'started',
    url,
    pid,
    logFile,
    stateFile: uiStateFile,
  });
}

async function handleUiShutdown(options) {
  const uiUrl = resolveUiShutdownUrl(options);
  const response = await requestJson(`${uiUrl}/api/shutdown`, { method: 'POST' });
  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const key = buildUiKeyFromUrl(uiUrl);
  if (key && uiState.deployments[key]) {
    delete uiState.deployments[key];
    saveUiState(uiStateFile, uiState);
  }
  printJson({ url: uiUrl, response });
}

function resolveUiServeOptionsForUrl(options, uiHttpUrl) {
  const serveOptions = resolveUiServeOptions(options);
  try {
    const parsed = new URL(uiHttpUrl);
    return {
      ...serveOptions,
      host: parsed.hostname || serveOptions.host,
      port: parsed.port ? Number(parsed.port) : serveOptions.port,
    };
  } catch {
    return serveOptions;
  }
}

async function waitForUiServerReady({ uiHttpUrl, timeoutMs = 30000, intervalMs = 250 }) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    const probe = await probeUiHttpUrl(uiHttpUrl, Math.min(2000, timeoutMs));
    if (probe.running && probe.isUi) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
}

async function startUiServerForVerification({ options, uiHttpUrl }) {
  const serveOptions = resolveUiServeOptionsForUrl(options, uiHttpUrl);
  const probe = await probeUiServer({
    host: serveOptions.host,
    port: serveOptions.port,
    timeoutMs: serveOptions.timeoutMs,
  });
  if (probe.running) {
    if (!probe.isUi) {
      throw new Error(
        `Port ${serveOptions.port} is in use but does not look like the Metrics UI.`,
      );
    }
    return {
      startedByVerifier: false,
      uiHttpUrl: `http://${serveOptions.host}:${serveOptions.port}`,
      logFile: null,
      uiStateFile: resolveUiStateFile(options),
    };
  }

  await ensureUiDependencies(serveOptions.uiDir, serveOptions.skipInstall);

  const logFile = resolveCliLogFile(options, 'ui_verify');
  const env = {
    ...process.env,
    HOST: serveOptions.host,
    PORT: String(serveOptions.port),
  };
  const script = serveOptions.mode === 'start' ? 'start' : 'dev';
  const pid = spawnDetachedProcess({
    command: 'npm',
    args: ['--prefix', serveOptions.uiDir, 'run', script],
    cwd: serveOptions.uiDir,
    env,
    logFile,
  });

  const uiStateFile = resolveUiStateFile(options);
  const uiState = loadUiState(uiStateFile);
  const key = buildUiKey(serveOptions.host, serveOptions.port);
  uiState.deployments[key] = {
    key,
    host: serveOptions.host,
    port: serveOptions.port,
    url: `http://${serveOptions.host}:${serveOptions.port}`,
    pid,
    uiDir: serveOptions.uiDir,
    mode: serveOptions.mode,
    logFile,
    startedAt: new Date().toISOString(),
  };
  saveUiState(uiStateFile, uiState);

  const startedUrl = `http://${serveOptions.host}:${serveOptions.port}`;
  const ready = await waitForUiServerReady({
    uiHttpUrl: startedUrl,
    timeoutMs: Math.max(10000, serveOptions.timeoutMs * 3),
    intervalMs: 250,
  });
  if (!ready) {
    throw new Error(`Timed out waiting for Metrics UI to start at ${startedUrl}.`);
  }

  return {
    startedByVerifier: true,
    uiHttpUrl: startedUrl,
    logFile,
    uiStateFile,
  };
}

async function ensureUiServerForVerification({
  options,
  uiHttpUrl,
  requireWs = false,
  autoServe = true,
  shutdownOnExit = true,
}) {
  const initialProbe = await probeUiHttpUrl(uiHttpUrl, 3000);
  if (initialProbe.running && !initialProbe.isUi) {
    throw new Error(`Target ${uiHttpUrl} is running but is not the Metrics UI.`);
  }

  let startedByVerifier = false;
  let logFile = null;
  let uiStateFile = resolveUiStateFile(options);
  let resolvedHttpUrl = uiHttpUrl;

  if (!initialProbe.running) {
    if (!autoServe) {
      throw new Error(`Metrics UI is not running at ${uiHttpUrl}. Enable --auto-serve or start UI first.`);
    }
    const started = await startUiServerForVerification({ options, uiHttpUrl });
    startedByVerifier = Boolean(started.startedByVerifier);
    resolvedHttpUrl = started.uiHttpUrl || uiHttpUrl;
    logFile = started.logFile || null;
    uiStateFile = started.uiStateFile || uiStateFile;
  } else {
    resolvedHttpUrl = initialProbe.url || uiHttpUrl;
  }

  const verifyProbe = await probeUiHttpUrl(resolvedHttpUrl, 3000);
  if (!verifyProbe.running || !verifyProbe.isUi) {
    throw new Error(`Metrics UI is not reachable at ${resolvedHttpUrl}.`);
  }

  const uiWsUrl = requireWs ? await resolveUiWsUrl(resolvedHttpUrl) : null;
  if (requireWs && !uiWsUrl) {
    throw new Error(`Unable to resolve Metrics UI websocket url from ${resolvedHttpUrl}.`);
  }

  return {
    uiHttpUrl: resolvedHttpUrl,
    uiWsUrl,
    startedByVerifier,
    shutdownOnExit: startedByVerifier && shutdownOnExit,
    logFile,
    uiStateFile,
  };
}

async function finalizeUiServerForVerification(lifecycle) {
  if (!lifecycle || !lifecycle.startedByVerifier || !lifecycle.shutdownOnExit) {
    return {
      attempted: false,
      result: 'not-requested',
      error: null,
    };
  }

  const uiHttpUrl = lifecycle.uiHttpUrl;
  try {
    const probe = await probeUiHttpUrl(uiHttpUrl, 2000);
    if (probe.running) {
      await requestJson(`${uiHttpUrl}/api/shutdown`, { method: 'POST' });
    }
    const uiStateFile = lifecycle.uiStateFile;
    if (uiStateFile) {
      const uiState = loadUiState(uiStateFile);
      const key = buildUiKeyFromUrl(uiHttpUrl);
      if (key && uiState.deployments[key]) {
        delete uiState.deployments[key];
        saveUiState(uiStateFile, uiState);
      }
    }
    return {
      attempted: true,
      result: 'stopped',
      error: null,
    };
  } catch (error) {
    return {
      attempted: true,
      result: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function handleConfig(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('config');
    return;
  }

  const subcommand = positional[0] || 'show';
  const resolved = resolveCliConfigLocation(argv ?? [], DEFAULT_CLI_CONFIG_PATH);
  const configPath = resolved.path;
  if (!configPath) {
    throw new Error('Missing CLI config path.');
  }

  if (subcommand === 'show' || subcommand === 'get') {
    const configState = readCliConfigFile(configPath);
    printJson({
      path: configPath,
      exists: configState.exists,
      config: redactCliConfig(configState.data),
    });
    return;
  }

  if (subcommand === 'set') {
    const configState = readCliConfigFile(configPath);
    const updated = { ...configState.data };
    let changed = false;

    const server = readConfigOption(options, 'server', '--server');
    if (server !== null) {
      updated.server = server;
      changed = true;
    }

    const token = readConfigOption(options, 'token', '--token');
    if (token !== null) {
      updated.token = token;
      changed = true;
    }

    const morphApiKey = readConfigOption(options, 'morph-api-key', '--morph-api-key');
    if (morphApiKey !== null) {
      updated.morphApiKey = morphApiKey;
      changed = true;
    }

    const snapshot = readConfigOption(options, 'snapshot', '--snapshot');
    if (snapshot !== null) {
      updated.snapshot = snapshot;
      changed = true;
    }

    const fleetConfig = readConfigOption(options, 'fleet-config', '--fleet-config');
    if (fleetConfig !== null) {
      updated.fleetConfig = fleetConfig;
      changed = true;
    }

    const workspace = readConfigOption(options, 'workspace', '--workspace');
    if (workspace !== null) {
      updated.workspace = workspace;
      changed = true;
    }

    const uiUrl = readConfigOption(options, 'ui', '--ui');
    if (uiUrl !== null) {
      updated.uiUrl = uiUrl;
      changed = true;
    }

    const uiDir = readConfigOption(options, 'ui-dir', '--ui-dir');
    if (uiDir !== null) {
      updated.uiDir = uiDir;
      changed = true;
    }

    const uiHost = readConfigOption(options, 'ui-host', '--ui-host');
    if (uiHost !== null) {
      updated.uiHost = uiHost;
      changed = true;
    }

    const uiPort = readConfigOption(options, 'ui-port', '--ui-port');
    if (uiPort !== null) {
      parseOptionalNumber(uiPort, 'ui-port');
      updated.uiPort = uiPort;
      changed = true;
    }

    const uiMode = readConfigOption(options, 'ui-mode', '--ui-mode');
    if (uiMode !== null) {
      updated.uiMode = normalizeUiServeMode(uiMode);
      changed = true;
    }

    if (!changed) {
      throw new Error(
        'No config fields provided. Use --token, --morph-api-key, --server, --snapshot, ' +
          '--fleet-config, --workspace, --ui, --ui-dir, --ui-host, --ui-port, or --ui-mode.',
      );
    }

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    console.log(`[config] wrote ${configPath}`);
    return;
  }

  throw new Error(`Unknown config subcommand: ${subcommand}`);
}

async function handleRun(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('run');
    return;
  }

  if (subcommand === 'create') {
    const runsRoot = resolveRunsRoot(options);
    const server = resolveServerUrl(options);
    const name = options.name || '';
    const notes = options.notes || '';

    const run = createRunMetadata({
      id: buildRunId(),
      name,
      server,
      notes,
    });

    const runDir = path.join(runsRoot, run.id);
    fs.mkdirSync(runDir, { recursive: true });
    writeRunMetadata(runDir, run);

    console.log(`[run] Created ${run.id}`);
    console.log(`path: ${runDir}`);
    printJson(run);
    return;
  }

  if (subcommand === 'show') {
    const runContext = resolveRunContext(options);
    if (!runContext) {
      throw new Error('Missing --run for run show.');
    }
    printJson(runContext.data);
    return;
  }

  if (subcommand === 'record') {
    const runContext = resolveRunContext(options);
    if (!runContext) {
      throw new Error('Missing --run for run record.');
    }

    const server = resolveServerUrl(options, runContext);
    const authHeader = resolveAuthHeader(options);
    const streamInput = options.stream || 'simulation';
    const streamPath = resolveStreamPath(streamInput);
    const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
      ? streamPath
      : buildUrl(server, streamPath);

    const format = (options.format || 'jsonl').toLowerCase();
    if (format !== 'jsonl' && format !== 'json') {
      throw new Error('Invalid --format value. Expected jsonl or json.');
    }

    const maxFrames = parseOptionalNumber(options.frames, 'frames');
    const durationMs = parseOptionalNumber(options.duration, 'duration');
    if (!maxFrames && !durationMs) {
      throw new Error('Provide --frames or --duration to bound the capture.');
    }

    const componentId = options.component || '';
    const entityId = options.entity || '';
    const includeAcks = Boolean(options['include-acks']);
    const skipStart = Boolean(options['no-start']);
    const pauseAfter = Boolean(options.pause);
    const skipStop = Boolean(options['no-stop']);

    const outputPath = resolveCapturePath(options.out, runContext, streamInput, format);

    if (!skipStart) {
      const startMessageId = buildMessageId(runContext.id, 'run-start');
      await requestJson(
        buildUrl(server, '/simulation/start'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: startMessageId }),
        },
        authHeader,
      );
      recordRunEvent(runContext, { type: 'playback', action: 'start', messageId: startMessageId });
    }

    let captureSummary;
    try {
      captureSummary = await captureStream({
        url,
        outputPath,
        format,
        maxFrames,
        durationMs,
        componentId,
        entityId,
        includeAcks,
        authHeader,
      });
    } finally {
      if (!skipStop) {
        const action = pauseAfter ? 'pause' : 'stop';
        const stopMessageId = buildMessageId(runContext.id, `run-${action}`);
        await requestJson(
          buildUrl(server, `/simulation/${action}`),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: stopMessageId }),
          },
          authHeader,
        ).catch(() => undefined);
        recordRunEvent(runContext, { type: 'playback', action, messageId: stopMessageId });
      }
    }

    if (captureSummary) {
      console.log(`[run] capture saved to ${captureSummary.outputPath}`);
      recordRunCapture(runContext, {
        type: 'capture',
        stream: streamInput,
        format,
        outputPath: captureSummary.outputPath,
        recordCount: captureSummary.recordCount,
        frameCount: captureSummary.frameCount,
        ackCount: captureSummary.ackCount,
        durationMs: captureSummary.durationMs,
        componentId: componentId || null,
        entityId: entityId || null,
        includeAcks,
      });
    }
    return;
  }

  throw new Error(`Unknown run subcommand: ${subcommand}`);
}

async function handleWait(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('wait');
    return;
  }

  const desiredState = options.state;
  if (!desiredState) {
    throw new Error('Missing --state for wait.');
  }

  const player = normalizePlayer(options.player);
  const runContext = resolveRunContext(options);
  const server = resolveServerUrl(options, runContext);
  const authHeader = resolveAuthHeader(options);

  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 30000;
  const intervalMs = parseOptionalNumber(options.interval, 'interval') ?? 500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await requestJson(buildUrl(server, '/status'), { method: 'GET' }, authHeader);
    const status = response?.[player]?.state;
    if (status === desiredState) {
      console.log(`[wait] ${player} is ${desiredState}`);
      return;
    }
    await delay(intervalMs);
  }

  throw new Error(`Timed out waiting for ${player} to reach state ${desiredState}.`);
}

async function handleDeploy(argvRest) {
  const [subcommand, ...rest] = argvRest;
  const { options } = parseArgs(rest);
  if (options.help || !subcommand) {
    printUsage('deploy');
    return;
  }

  if (subcommand === 'start') {
    await deployStart(options);
    return;
  }

  if (subcommand === 'stop') {
    await deployStop(options);
    return;
  }

  if (subcommand === 'list') {
    deployList(options);
    return;
  }

  throw new Error(`Unknown deploy subcommand: ${subcommand}`);
}

async function handleLog(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('log');
    return;
  }

  const subcommand = positional[0] || 'list';
  if (subcommand === 'list') {
    const logDir = resolveCliLogDir(options);
    const typeFilter = options.type ? String(options.type).toLowerCase() : null;
    const entries = listCliLogs(logDir, typeFilter);
    if (entries.length === 0) {
      printJson({ logDir, entries: [] });
      return;
    }
    printJson({ logDir, entries });
    return;
  }

  if (subcommand === 'view') {
    const logDir = resolveCliLogDir(options);
    const target = options.file || options.id || positional[1];
    if (!target) {
      throw new Error('Provide --file, --id, or a filename to view.');
    }
    const resolved = resolveCliLogTarget(logDir, String(target), options.type);
    const content = fs.readFileSync(resolved, 'utf8');
    process.stdout.write(content);
    return;
  }

  throw new Error(`Unknown log subcommand: ${subcommand}`);
}

async function handleCodebase(argvRest) {
  const [subcommand, ...rest] = argvRest;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printUsage('codebase');
    return;
  }

  const { options } = parseArgs(rest);
  if (options.help) {
    printUsage('codebase');
    return;
  }

  const server = resolveServerUrl(options);
  const authHeader = resolveAuthHeader(options);

  if (subcommand === 'tree') {
    const queryPath = options.path ? `?path=${encodeURIComponent(String(options.path))}` : '';
    const url = buildUrl(server, `/codebase/tree${queryPath}`);
    const response = await requestJson(url, { method: 'GET' }, authHeader);
    printJson(response);
    return;
  }

  if (subcommand === 'file') {
    const filePath = options.path ?? options.file;
    if (!filePath) {
      throw new Error('Missing --path for codebase file.');
    }
    const url = buildUrl(server, `/codebase/file?path=${encodeURIComponent(String(filePath))}`);
    const response = await requestJson(url, { method: 'GET' }, authHeader);
    printJson(response);
    return;
  }

  throw new Error(`Unknown codebase subcommand: ${subcommand}`);
}

async function handleFleet(argvRest) {
  const { options, positional } = parseArgs(argvRest);
  if (options.help) {
    printUsage('fleet');
    return;
  }

  const subcommand = positional[0];
  if (subcommand) {
    if (subcommand !== 'scaffold') {
      throw new Error(`Unknown fleet subcommand: ${subcommand}`);
    }
    const outInput =
      options.out ||
      options.config ||
      options.file ||
      options['config-file'] ||
      'fleet.json';
    const outputPath = path.resolve(process.cwd(), String(outInput));
    writeFleetScaffold({
      outputPath,
      force: Boolean(options.force),
    });
    console.log(`[fleet] scaffold written to ${outputPath}`);
    return;
  }

  const configPath = resolveFleetConfigPath(options);
  if (!configPath) {
    throw new Error('Missing --config for fleet (or set fleetConfig in ~/.simeval/config.json).');
  }

  const config = loadFleetConfig(configPath);
  applyCliFleetDefaults(config);
  const configDir = path.dirname(configPath);
  const runId = buildFleetRunId();

  const uiOverride = options.ui || options.ws || options['ui-url'] || options['ws-url'];
  const uiUrl = uiOverride
    ? await resolveUiWsUrl(uiOverride)
    : config.ui?.url
      ? await resolveUiWsUrl(config.ui.url)
      : CLI_CONFIG?.data?.uiUrl
        ? await resolveUiWsUrl(CLI_CONFIG.data.uiUrl)
        : '';
  if (!uiOverride && !config.ui?.url && CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (fleet): ${CLI_CONFIG.data.uiUrl}`);
  }
  if (uiOverride && !uiUrl) {
    throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
  }
  if (config.ui?.url && !uiUrl) {
    throw new Error('Invalid ui.url in config. Provide a ws:// or http(s):// URL.');
  }

  const defaults = normalizeFleetDefaults(config.defaults);
  const continueOnError = parseBooleanOption(
    options['continue-on-error'] ?? config.continueOnError,
    false,
  );

  const results = {
    status: 'ok',
    config: configPath,
    runId,
    deployments: [],
    errors: [],
  };

  for (let deploymentIndex = 0; deploymentIndex < config.deployments.length; deploymentIndex += 1) {
    const deployment = mergeFleetDeployment(defaults, config.deployments[deploymentIndex]);
    const deploymentName = String(
      deployment.name || `deployment-${deploymentIndex + 1}`,
    );
    const deploymentUiUrl = uiOverride
      ? uiUrl
      : deployment.ui?.url
        ? await resolveUiWsUrl(deployment.ui.url)
        : uiUrl;
    if (deployment.ui?.url && !deploymentUiUrl) {
      throw new Error(`Invalid ui.url for deployment ${deploymentName}.`);
    }
    const deploymentLog = buildFleetLogger({ deployment: deploymentName });
    const deploymentResult = {
      name: deploymentName,
      status: 'ok',
      instances: [],
      errors: [],
    };

    deploymentLog(`Starting (${deployment.count} instance${deployment.count === 1 ? '' : 's'})`);

    try {
      const provisioned = await runFleetProvision({
        deployment,
        deploymentName,
        log: deploymentLog,
      });
      const instances = Array.isArray(provisioned?.instances) ? provisioned.instances : [];
      const morphStateFile =
        provisioned?.stateFile ||
        deployment.provision?.stateFile ||
        resolveMorphcloudStateFile(options);
      deploymentResult.stateFile = morphStateFile;
      if (instances.length === 0) {
        throw new Error('Provisioning returned zero instances.');
      }

      for (let instanceIndex = 0; instanceIndex < instances.length; instanceIndex += 1) {
        const instance = instances[instanceIndex];
        const instanceName =
          instance?.name || `${deploymentName}-${instanceIndex + 1}`;
        const instanceLog = buildFleetLogger({
          deployment: deploymentName,
          instance: instanceName,
        });
        const instanceResult = {
          id: instance?.id ?? null,
          name: instanceName,
          apiUrl: instance?.apiUrl ?? null,
          authToken: instance?.authToken ?? null,
          status: 'ok',
          captures: [],
          snapshot: null,
          cleanup: null,
          labels: null,
          errors: [],
        };
        const tokens = buildFleetTemplateTokens({
          deploymentName,
          instanceName,
          instanceIndex,
          instanceId: instance?.id ?? null,
          runId,
        });

        try {
          if (!instance?.apiUrl) {
            throw new Error('Missing apiUrl in provisioned instance.');
          }

          const instanceLabels = renderFleetMetadataEntries(
            deployment.labels.instance,
            tokens,
            'labels.instance',
          );
          if (instanceLabels.length > 0) {
            await applyFleetInstanceMetadata({
              instanceId: instance.id,
              labels: instanceLabels,
              log: instanceLog,
            });
            instanceResult.labels = {
              instance: instanceLabels,
              snapshot: null,
            };
          }

          await waitForFleetServer({
            server: instance.apiUrl,
            authHeader: buildAuthHeader(instance.authToken),
            timeoutMs: deployment.readyTimeoutMs,
            intervalMs: deployment.readyIntervalMs,
            log: instanceLog,
          });

          if (deployment.postProvision?.exec?.length) {
            await runFleetExec({
              instanceId: instance.id,
              commands: deployment.postProvision.exec,
              log: instanceLog,
            });
          }

          if (deployment.plugins.length > 0) {
            await uploadFleetPlugins({
              plugins: deployment.plugins,
              configDir,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.components.length > 0) {
            await injectFleetComponents({
              components: deployment.components,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.systems.length > 0) {
            await injectFleetSystems({
              systems: deployment.systems,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.components.length > 0 || deployment.systems.length > 0) {
            await logFleetStatusAfterInjection({
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              deployment,
              log: instanceLog,
            });
          }

          if (deployment.playback?.start) {
            await runFleetPlayback({
              action: 'start',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          const capturePlans = await prepareFleetCaptures({
            captures: deployment.captures,
            configDir,
            deploymentName,
            instanceIndex,
            instance,
            runId,
            defaultUiUrl: deploymentUiUrl,
            defaultPollSeconds: deployment.ui?.pollSeconds ?? config.ui?.pollSeconds,
            log: instanceLog,
          });

          if (capturePlans.length > 0) {
            const runCaptures = deployment.captureMode === 'sequential'
              ? runFleetCapturesSequential
              : runFleetCapturesParallel;
            const summaries = await runCaptures({
              plans: capturePlans,
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
            instanceResult.captures = summaries;
          }

          if (deployment.cleanup.snapshot) {
            const snapshotLabels = renderFleetMetadataEntries(
              deployment.labels.snapshot,
              tokens,
              'labels.snapshot',
            );
            const snapshotResult = await runFleetSnapshot({
              instanceId: instance.id,
              labels: snapshotLabels,
              log: instanceLog,
            });
            instanceResult.snapshot = snapshotResult;
            if (snapshotLabels.length > 0) {
              if (!instanceResult.labels) {
                instanceResult.labels = { instance: [], snapshot: snapshotLabels };
              } else {
                instanceResult.labels.snapshot = snapshotLabels;
              }
            }
            recordFleetSnapshotState({
              stateFile: morphStateFile,
              instanceId: instance.id,
              snapshot: snapshotResult,
              runId,
            });
          }

          if (deployment.playback?.pause) {
            await runFleetPlayback({
              action: 'pause',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          } else if (deployment.playback?.stop) {
            await runFleetPlayback({
              action: 'stop',
              server: instance.apiUrl,
              authHeader: buildAuthHeader(instance.authToken),
              log: instanceLog,
            });
          }

          if (deployment.cleanup.stop) {
            const stopResult = await runFleetStopInstance({
              instanceId: instance.id,
              log: instanceLog,
            });
            instanceResult.cleanup = { stop: stopResult };
            recordFleetStopState({
              stateFile: morphStateFile,
              instanceId: instance.id,
              forget: deployment.cleanup.forget,
            });
          }
        } catch (error) {
          instanceResult.status = 'failed';
          const message = error instanceof Error ? error.message : String(error);
          instanceResult.errors.push(message);
          deploymentResult.errors.push(`${instanceName}: ${message}`);
          instanceLog(`Failed: ${message}`);
          await captureFleetFailureDiagnostics({ instanceId: instance?.id, log: instanceLog });
          if (deployment.cleanup.stopOnFailure && instance?.id) {
            try {
              const stopResult = await runFleetStopInstance({
                instanceId: instance.id,
                log: instanceLog,
              });
              instanceResult.cleanup = { stopOnFailure: stopResult };
              recordFleetStopState({
                stateFile: morphStateFile,
                instanceId: instance.id,
                forget: deployment.cleanup.forget,
              });
            } catch (stopError) {
              const stopMessage = stopError instanceof Error ? stopError.message : String(stopError);
              instanceResult.errors.push(`Cleanup stop failed: ${stopMessage}`);
              instanceLog(`Cleanup stop failed: ${stopMessage}`);
            }
          }
          if (!continueOnError) {
            throw error;
          }
        }

        deploymentResult.instances.push(instanceResult);
      }
    } catch (error) {
      deploymentResult.status = 'failed';
      const message = error instanceof Error ? error.message : String(error);
      deploymentResult.errors.push(message);
      results.errors.push(`${deploymentName}: ${message}`);
      deploymentLog(`Failed: ${message}`);
      if (!continueOnError) {
        throw error;
      }
    }

    if (deploymentResult.errors.length > 0 && deploymentResult.status !== 'failed') {
      deploymentResult.status = 'partial';
    }

    results.deployments.push(deploymentResult);
  }

  const hasErrors =
    results.errors.length > 0 ||
    results.deployments.some((deployment) => deployment.status !== 'ok');
  if (hasErrors) {
    results.status = continueOnError ? 'partial' : 'failed';
  }

  printJson(results);
}

async function handleMorphcloud(argvRest) {
  if (argvRest.length === 0) {
    argvRest = ['--help'];
  }
  const distributorPath = path.resolve(__dirname, 'morphcloud_distributor.js');
  await runCommand('node', [distributorPath, ...argvRest], { cwd: __dirname });
}

function resolveFleetConfigPath(options) {
  const configInput = options.config || options.file || options['config-file'];
  if (configInput) {
    return path.resolve(process.cwd(), String(configInput));
  }
  if (CLI_CONFIG?.data?.fleetConfig) {
    return path.resolve(CLI_CONFIG.dir, String(CLI_CONFIG.data.fleetConfig));
  }
  return '';
}

function applyCliFleetDefaults(config) {
  if (!CLI_CONFIG?.data?.snapshot) {
    return;
  }
  if (!config.defaults || typeof config.defaults !== 'object') {
    config.defaults = {};
  }
  if (!config.defaults.snapshot) {
    config.defaults.snapshot = CLI_CONFIG.data.snapshot;
  }
}

function loadFleetConfig(configPath) {
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read config file: ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse config JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Fleet config must be a JSON object.');
  }
  if (!Array.isArray(parsed.deployments) || parsed.deployments.length === 0) {
    throw new Error('Fleet config must include a non-empty deployments array.');
  }

  return parsed;
}

function buildFleetScaffold() {
  return {
    ui: {
      url: 'ws://localhost:5050/ws/control',
      pollSeconds: 2,
    },
    defaults: {
      snapshot: 'SNAPSHOT_ID',
      mode: 'build',
      count: 1,
      parallel: 1,
      readyTimeoutMs: 60000,
      readyIntervalMs: 2000,
      captureMode: 'parallel',
      labels: {
        instance: DEFAULT_FLEET_LABELS.instance.slice(),
        snapshot: DEFAULT_FLEET_LABELS.snapshot.slice(),
      },
      cleanup: {
        snapshot: true,
        stop: true,
        stopOnFailure: true,
        forget: false,
      },
      provision: {
        args: ['--skip-tests'],
      },
      playback: {
        start: true,
        stop: true,
      },
      postProvision: {
        exec: [],
      },
      plugins: [],
      components: [],
      systems: [],
      captures: [
        {
          stream: 'evaluation',
          frames: 200,
          out: 'verification/fleet_runs/${deployment}/${instance}_evaluation.jsonl',
          ui: {
            captureId: '${deployment}-${instance}-eval',
            filename: '${deployment}_${instance}_evaluation.jsonl',
          },
        },
      ],
    },
    deployments: [
      {
        name: 'example',
        count: 1,
      },
    ],
  };
}

function writeFleetScaffold({ outputPath, force }) {
  if (fs.existsSync(outputPath) && !force) {
    throw new Error(`File already exists: ${outputPath}. Use --force to overwrite.`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(buildFleetScaffold(), null, 2)}\n`, 'utf8');
}

function normalizeFleetDefaults(value) {
  const defaults = value && typeof value === 'object' ? { ...value } : {};
  if (!Object.prototype.hasOwnProperty.call(defaults, 'labels')) {
    defaults.labels = {
      instance: DEFAULT_FLEET_LABELS.instance.slice(),
      snapshot: DEFAULT_FLEET_LABELS.snapshot.slice(),
    };
  }
  if (!Object.prototype.hasOwnProperty.call(defaults, 'cleanup')) {
    defaults.cleanup = { ...DEFAULT_FLEET_CLEANUP };
  }
  return defaults;
}

function mergeFleetDeployment(defaults, deployment) {
  if (!deployment || typeof deployment !== 'object') {
    throw new Error('Each deployment must be an object.');
  }

  const merged = {
    ...defaults,
    ...deployment,
    provision: {
      ...(defaults.provision ?? {}),
      ...(deployment.provision ?? {}),
    },
    playback: {
      ...(defaults.playback ?? {}),
      ...(deployment.playback ?? {}),
    },
    ui: {
      ...(defaults.ui ?? {}),
      ...(deployment.ui ?? {}),
    },
    postProvision: {
      ...(defaults.postProvision ?? {}),
      ...(deployment.postProvision ?? {}),
    },
  };

  merged.snapshot = merged.snapshot ?? defaults.snapshot ?? null;
  if (!merged.snapshot) {
    throw new Error('Deployment is missing snapshot.');
  }

  merged.mode = normalizeFleetMode(merged.mode ?? 'build');
  merged.count = coercePositiveInt(merged.count ?? 1, 'count');
  merged.parallel = coercePositiveInt(
    merged.parallel ?? merged.provision?.parallel ?? defaults.parallel ?? 1,
    'parallel',
  );
  merged.readyTimeoutMs = coercePositiveInt(
    merged.readyTimeoutMs ?? defaults.readyTimeoutMs ?? 60000,
    'readyTimeoutMs',
  );
  merged.readyIntervalMs = coercePositiveInt(
    merged.readyIntervalMs ?? defaults.readyIntervalMs ?? 2000,
    'readyIntervalMs',
  );
  merged.captureMode =
    merged.captureMode === 'sequential' ? 'sequential' : 'parallel';

  merged.plugins = mergeFleetArray(defaults.plugins, deployment.plugins, 'plugins');
  merged.components = mergeFleetArray(defaults.components, deployment.components, 'components');
  merged.systems = mergeFleetArray(defaults.systems, deployment.systems, 'systems');
  merged.captures = mergeFleetArray(defaults.captures, deployment.captures, 'captures');

  merged.playback = {
    start: parseBooleanOption(merged.playback?.start, true),
    stop: parseBooleanOption(merged.playback?.stop, true),
    pause: parseBooleanOption(merged.playback?.pause, false),
  };

  merged.ui = {
    ...merged.ui,
    pollSeconds: normalizePollSeconds(merged.ui?.pollSeconds),
  };

  merged.provision = {
    ...merged.provision,
    args: mergeFleetArray(defaults.provision?.args, deployment.provision?.args, 'provision.args'),
    skipUpdate: parseBooleanOption(merged.provision?.skipUpdate, true),
    requireUpdate: parseBooleanOption(merged.provision?.requireUpdate, false),
  };

  merged.postProvision = {
    exec: mergeFleetArray(defaults.postProvision?.exec, deployment.postProvision?.exec, 'postProvision.exec'),
  };

  const defaultLabels = normalizeFleetLabels(defaults.labels);
  const deploymentLabels = normalizeFleetLabels(deployment.labels);
  merged.labels = {
    instance: mergeFleetMetadata(defaultLabels.instance, deploymentLabels.instance, 'labels.instance'),
    snapshot: mergeFleetMetadata(defaultLabels.snapshot, deploymentLabels.snapshot, 'labels.snapshot'),
  };

  const defaultCleanup = normalizeFleetCleanup(defaults.cleanup);
  const deploymentCleanup = normalizeFleetCleanup(deployment.cleanup);
  merged.cleanup = {
    snapshot: parseBooleanOption(deploymentCleanup.snapshot, defaultCleanup.snapshot ?? false),
    stop: parseBooleanOption(deploymentCleanup.stop, defaultCleanup.stop ?? false),
    stopOnFailure: parseBooleanOption(
      deploymentCleanup.stopOnFailure,
      defaultCleanup.stopOnFailure ?? false,
    ),
    forget: parseBooleanOption(deploymentCleanup.forget, defaultCleanup.forget ?? false),
  };

  return merged;
}

function normalizeFleetMode(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'build' || normalized === 'clone') {
    return normalized;
  }
  throw new Error(`Invalid mode: ${value}. Expected build or clone.`);
}

function coercePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function coercePositiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function normalizePollSeconds(value) {
  if (value === undefined || value === null || value === '') {
    return 2;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid pollSeconds: ${value}`);
  }
  return parsed;
}

function mergeFleetArray(defaultValue, overrideValue, label) {
  const base = defaultValue === undefined ? [] : defaultValue;
  if (overrideValue === undefined) {
    if (!Array.isArray(base)) {
      throw new Error(`Expected ${label} to be an array.`);
    }
    return base.slice();
  }
  if (overrideValue === null) {
    return [];
  }
  if (!Array.isArray(overrideValue)) {
    throw new Error(`Expected ${label} to be an array.`);
  }
  return Array.isArray(base) ? base.concat(overrideValue) : overrideValue.slice();
}

function normalizeFleetLabels(value) {
  return value && typeof value === 'object' ? value : {};
}

function normalizeFleetCleanup(value) {
  return value && typeof value === 'object' ? value : {};
}

function normalizeFleetMetadataValue(value, label) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, entryValue]) => `${key}=${entryValue}`);
  }
  throw new Error(`Expected ${label} to be an array, string, or object.`);
}

function mergeFleetMetadata(defaultValue, overrideValue, label) {
  const base = normalizeFleetMetadataValue(defaultValue, label);
  if (overrideValue === undefined) {
    return base.slice();
  }
  if (overrideValue === null) {
    return [];
  }
  const override = normalizeFleetMetadataValue(overrideValue, label);
  return base.concat(override);
}

function buildFleetLogger({ deployment, instance } = {}) {
  const parts = ['fleet'];
  if (deployment) {
    parts.push(deployment);
  }
  if (instance) {
    parts.push(instance);
  }
  const prefix = parts.join(':');
  return (message) => console.log(`[${prefix}] ${message}`);
}

function buildFleetRunId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '');
}

function buildFleetTemplateTokens({
  deploymentName,
  instanceName,
  instanceIndex,
  instanceId,
  runId,
}) {
  return {
    deployment: String(deploymentName ?? ''),
    instance: String(instanceName ?? ''),
    index: String((instanceIndex ?? 0) + 1),
    instanceId: instanceId ? String(instanceId) : '',
    runId: runId ? String(runId) : '',
  };
}

async function runFleetProvision({ deployment, deploymentName, log }) {
  const namePrefix =
    deployment.provision?.namePrefix ??
    deployment.namePrefix ??
    deployment.name ??
    deploymentName;
  const args = [
    'provision',
    '--snapshot',
    String(deployment.snapshot),
    '--mode',
    deployment.mode,
    '--count',
    String(deployment.count),
    '--parallel',
    String(deployment.parallel),
    '--name-prefix',
    String(namePrefix),
  ];
  if (deployment.provision?.memory) {
    args.push('--memory', String(deployment.provision.memory));
  }
  if (deployment.provision?.vcpus) {
    args.push('--vcpus', String(deployment.provision.vcpus));
  }

  if (deployment.provision?.stateFile) {
    args.push('--state', String(deployment.provision.stateFile));
  }
  if (deployment.provision?.skipUpdate) {
    args.push('--skip-update');
  }
  if (deployment.provision?.requireUpdate) {
    args.push('--require-update');
  }
  if (deployment.provision?.args?.length) {
    args.push(...deployment.provision.args.map(String));
  }

  log(`Provisioning ${deployment.count} instance(s) from ${deployment.snapshot} (${deployment.mode})`);

  const distributorPath = path.resolve(__dirname, 'morphcloud_distributor.js');
  const result = await runCommandCapture('node', [distributorPath, ...args], {
    cwd: __dirname,
    prefix: `[fleet:${deploymentName}] `,
  });

  if (result.code !== 0) {
    throw new Error(`Provisioning failed with code ${result.code}`);
  }

  const parsed = extractJsonFromOutput(result.stdout);
  if (!parsed) {
    throw new Error('Provisioning output did not include JSON payload.');
  }
  return parsed;
}

async function runFleetExec({ instanceId, commands, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for postProvision exec.');
  }
  const execCommands = Array.isArray(commands) ? commands : [];
  for (const command of execCommands) {
    if (!command || typeof command !== 'string') {
      continue;
    }
    log(`Exec: ${command}`);
    const wrappedCommand = wrapShellCommand(command);
    const result = await runCommandCapture(
      'morphcloud',
      ['instance', 'exec', instanceId, '--', 'bash', '-lc', wrappedCommand],
      { prefix: `[exec:${instanceId}] ` },
    );
    if (result.code !== 0) {
      throw new Error(`Exec failed (${command}) with code ${result.code}`);
    }
  }
}

async function captureFleetFailureDiagnostics({ instanceId, log }) {
  if (!instanceId) {
    return;
  }
  const command = 'journalctl -u simeval.service --no-pager -n 200';
  log(`Diagnostics: ${command}`);
  try {
    const result = await runCommandCapture(
      'morphcloud',
      ['instance', 'exec', instanceId, '--', 'bash', '-lc', wrapShellCommand(command)],
      { prefix: `[journalctl:${instanceId}] ` },
    );
    if (result.code !== 0) {
      log(`Diagnostics failed with code ${result.code}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Diagnostics failed: ${message}`);
  }
}

async function waitForFleetServer({ server, authHeader, timeoutMs, intervalMs, log }) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError = null;

  while (Date.now() < deadline) {
    attempt += 1;
    try {
      await requestJson(buildUrl(server, '/health'), { method: 'GET' }, authHeader);
      log('Server ready.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 1 || attempt % 3 === 0) {
        const message = error instanceof Error ? error.message : String(error);
        log(`Waiting for server... (${message})`);
      }
    }
    await delay(intervalMs);
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for server: ${message}`);
}

async function uploadFleetPlugins({ plugins, configDir, server, authHeader, log }) {
  for (const entry of plugins) {
    const plugin = normalizeFleetPluginEntry(entry, configDir);
    log(`Uploading ${plugin.source} -> ${plugin.dest}`);
    const content = fs.readFileSync(plugin.source, 'utf8');
    const messageId = buildMessageId(null, 'fleet-plugin-upload');
    const payload = {
      messageId,
      path: plugin.dest,
      content,
      overwrite: plugin.overwrite,
    };
    await requestJson(
      buildUrl(server, '/codebase/plugin'),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      authHeader,
    );
  }
}

function normalizeFleetPluginEntry(entry, configDir) {
  if (typeof entry === 'string') {
    return resolveFleetPlugin({
      source: entry,
      dest: null,
      overwrite: false,
    }, configDir);
  }
  if (!entry || typeof entry !== 'object') {
    throw new Error('Plugin entry must be a string or object.');
  }
  return resolveFleetPlugin({
    source: entry.source ?? entry.path ?? '',
    dest: entry.dest ?? entry.target ?? null,
    overwrite: Boolean(entry.overwrite),
  }, configDir);
}

function resolveFleetPlugin(entry, configDir) {
  const sourceInput = String(entry.source || '').trim();
  if (!sourceInput) {
    throw new Error('Plugin entry missing source.');
  }
  const sourcePath = path.isAbsolute(sourceInput)
    ? sourceInput
    : path.resolve(configDir, sourceInput);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Plugin source not found: ${sourcePath}`);
  }
  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    throw new Error(`Plugin source is not a file: ${sourcePath}`);
  }

  const dest = entry.dest ? String(entry.dest) : inferPluginPath(sourcePath);
  if (!dest) {
    throw new Error(`Unable to infer plugin destination for ${sourcePath}. Provide dest.`);
  }
  if (!dest.startsWith('plugins/')) {
    throw new Error(`Plugin destination must start with plugins/: ${dest}`);
  }

  return {
    source: sourcePath,
    dest,
    overwrite: Boolean(entry.overwrite),
  };
}

function logFleetInjectResponse({ log, kind, descriptor, response }) {
  const status = response?.data?.status ?? 'unknown';
  const messageId = response?.data?.messageId ?? 'unknown';
  const systemId = response?.data?.systemId ?? null;
  const detail = response?.data?.detail ?? null;
  const parts = [
    `Inject ${kind} response`,
    `status=${status}`,
    `messageId=${messageId}`,
  ];
  if (systemId) {
    parts.push(`systemId=${systemId}`);
  }
  if (detail) {
    parts.push(`detail=${detail}`);
  }
  parts.push(`player=${descriptor.player}`);
  parts.push(`module=${descriptor.modulePath}`);
  log(parts.join(' '));
}

async function injectFleetComponents({ components, server, authHeader, log }) {
  for (const entry of components) {
    const component = normalizeFleetInjectEntry(entry, 'component');
    log(`Inject component ${component.modulePath} (${component.player})`);
    const payload = {
      messageId: buildMessageId(null, 'fleet-component-inject'),
      component: {
        modulePath: component.modulePath,
        exportName: component.exportName || undefined,
      },
    };
    try {
      const response = await requestJsonWithStatus(
        buildUrl(server, `/${component.player}/component`),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        authHeader,
      );
      logFleetInjectResponse({
        log,
        kind: 'component',
        descriptor: component,
        response,
      });
      if (response.data?.status === 'error') {
        throw new Error(response.data?.detail || 'Component injection failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`Component injection error: ${message}`);
      throw error;
    }
  }
}

async function injectFleetSystems({ systems, server, authHeader, log }) {
  for (const entry of systems) {
    const system = normalizeFleetInjectEntry(entry, 'system');
    log(`Inject system ${system.modulePath} (${system.player})`);
    const payload = {
      messageId: buildMessageId(null, 'fleet-system-inject'),
      system: {
        modulePath: system.modulePath,
        exportName: system.exportName || undefined,
      },
    };
    try {
      const response = await requestJsonWithStatus(
        buildUrl(server, `/${system.player}/system`),
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
        authHeader,
      );
      logFleetInjectResponse({
        log,
        kind: 'system',
        descriptor: system,
        response,
      });
      if (response.data?.status === 'error') {
        throw new Error(response.data?.detail || 'System injection failed.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`System injection error: ${message}`);
      throw error;
    }
  }
}

async function logFleetStatusAfterInjection({ server, authHeader, deployment, log }) {
  try {
    const response = await requestJsonWithStatus(
      buildUrl(server, '/status'),
      { method: 'GET' },
      authHeader,
    );
    if (!response?.data || typeof response.data !== 'object') {
      log('Status after inject: unexpected response.');
      return;
    }
    const simulation = response.data.simulation ?? {};
    const evaluation = response.data.evaluation ?? {};
    log(
      `Status after inject: simulation state=${simulation.state ?? 'unknown'} tick=${simulation.tick ?? 'n/a'} systems=${simulation.systemCount ?? 'n/a'}; ` +
      `evaluation state=${evaluation.state ?? 'unknown'} tick=${evaluation.tick ?? 'n/a'} systems=${evaluation.systemCount ?? 'n/a'}`,
    );

    const systems = Array.isArray(deployment.systems) ? deployment.systems : [];
    const expectedSim = systems.filter((entry) => normalizePlayer(entry.player) === 'simulation').length;
    const expectedEval = systems.filter((entry) => normalizePlayer(entry.player) === 'evaluation').length;
    if (expectedSim > 0 && (!Number.isFinite(simulation.systemCount) || simulation.systemCount < expectedSim)) {
      log(`Warning: simulation systemCount=${simulation.systemCount ?? 'n/a'} after injecting ${expectedSim} system(s).`);
    }
    if (expectedEval > 0 && (!Number.isFinite(evaluation.systemCount) || evaluation.systemCount < expectedEval)) {
      log(`Warning: evaluation systemCount=${evaluation.systemCount ?? 'n/a'} after injecting ${expectedEval} system(s).`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Status after inject failed: ${message}`);
  }
}

function normalizeFleetInjectEntry(entry, label) {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`${label} entry must be an object.`);
  }
  const modulePath = String(entry.module || entry.path || entry.modulePath || '').trim();
  if (!modulePath) {
    throw new Error(`${label} entry missing module path.`);
  }
  if (!modulePath.startsWith('plugins/')) {
    throw new Error(`${label} modulePath must start with plugins/: ${modulePath}`);
  }
  return {
    player: normalizePlayer(entry.player),
    modulePath,
    exportName: entry.export ?? entry.exportName ?? null,
  };
}

async function prepareFleetCaptures({
  captures,
  configDir,
  deploymentName,
  instanceIndex,
  instance,
  runId,
  defaultUiUrl,
  defaultPollSeconds,
  log,
}) {
  const plans = [];
  const instanceName = instance?.name || `${deploymentName}-${instanceIndex + 1}`;
  const tokens = buildFleetTemplateTokens({
    deploymentName,
    instanceName,
    instanceIndex,
    instanceId: instance?.id ?? null,
    runId,
  });

  for (const capture of captures) {
    const plan = normalizeFleetCapturePlan({
      capture,
      configDir,
      tokens,
      instanceIndex,
      defaultUiUrl,
      defaultPollSeconds,
    });

    if (plan.adjustedPath) {
      log(`Adjusted capture output to ${plan.outputPath}`);
    }

    ensureCaptureFile(plan.outputPath);

    if (plan.ui) {
      log(`Connecting UI (${plan.ui.captureId}) -> ${plan.outputPath}`);
      await startUiLiveStream({
        uiUrl: plan.ui.url,
        source: plan.outputPath,
        captureId: plan.ui.captureId,
        filename: plan.ui.filename,
        pollIntervalMs: plan.ui.pollIntervalMs,
      });
    }

    plans.push(plan);
  }

  return plans;
}

function normalizeFleetCapturePlan({
  capture,
  configDir,
  tokens,
  instanceIndex,
  defaultUiUrl,
  defaultPollSeconds,
}) {
  if (!capture || typeof capture !== 'object') {
    throw new Error('Capture entry must be an object.');
  }

  const stream = String(capture.stream || '').trim();
  if (!stream) {
    throw new Error('Capture entry missing stream.');
  }

  const outTemplate = String(capture.out || '').trim();
  if (!outTemplate) {
    throw new Error('Capture entry missing out path.');
  }

  const renderedOut = renderFleetTemplate(outTemplate, tokens);
  const originalOutputPath = path.isAbsolute(renderedOut)
    ? renderedOut
    : path.resolve(configDir, renderedOut);
  let outputPath = originalOutputPath;
  let adjustedPath = false;
  if (instanceIndex > 0 && !usesFleetInstanceToken(outTemplate)) {
    outputPath = appendInstanceSuffix(outputPath, instanceIndex + 1);
    adjustedPath = true;
  }

  const format = String(capture.format || inferCaptureFormat(outputPath)).toLowerCase();
  if (format !== 'jsonl' && format !== 'json') {
    throw new Error(`Invalid capture format: ${format}`);
  }

  const maxFrames = capture.frames ? coercePositiveInt(capture.frames, 'frames') : null;
  const durationMs = capture.durationMs ?? capture.duration ?? null;
  const durationSeconds = capture.durationSeconds ?? capture.durationSec ?? null;
  const resolvedDurationMs = durationMs
    ? coercePositiveNumber(durationMs, 'durationMs')
    : durationSeconds
      ? coercePositiveNumber(durationSeconds, 'durationSeconds') * 1000
      : null;
  if (!maxFrames && !resolvedDurationMs) {
    throw new Error(`Capture ${stream} requires frames or duration.`);
  }

  const componentId = capture.component ? String(capture.component) : '';
  const entityId = capture.entity ? String(capture.entity) : '';
  const includeAcks = parseBooleanOption(capture.includeAcks, false);

  let ui = null;
  const wantsUi = capture.ui !== false;
  if (wantsUi && !defaultUiUrl && capture.ui) {
    throw new Error('Capture UI configured but no ui url available.');
  }
  if (wantsUi && defaultUiUrl) {
    const uiConfig = typeof capture.ui === 'object' && capture.ui ? capture.ui : {};
    const captureIdRaw =
      uiConfig.captureId ||
      uiConfig.id ||
      `${tokens.instance}-${stream}`;
    let captureId = renderFleetTemplate(String(captureIdRaw), tokens);
    if (instanceIndex > 0 && !usesFleetInstanceToken(String(captureIdRaw))) {
      captureId = `${captureId}-${instanceIndex + 1}`;
    }
    const filenameRaw = uiConfig.filename || path.basename(outputPath);
    const filename = renderFleetTemplate(String(filenameRaw), tokens);
    const pollSeconds = uiConfig.pollSeconds ?? defaultPollSeconds ?? 2;
    ui = {
      url: defaultUiUrl,
      captureId,
      filename,
      pollIntervalMs: Math.round(normalizePollSeconds(pollSeconds) * 1000),
    };
  }

  return {
    stream,
    outputPath,
    originalOutputPath,
    adjustedPath,
    format,
    maxFrames,
    durationMs: resolvedDurationMs,
    componentId,
    entityId,
    includeAcks,
    ui,
  };
}

function inferCaptureFormat(outputPath) {
  return outputPath.toLowerCase().endsWith('.json') ? 'json' : 'jsonl';
}

function renderFleetTemplate(value, tokens) {
  return String(value).replace(/\$\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      return tokens[key];
    }
    return '';
  });
}

function renderFleetMetadataEntries(entries, tokens, label) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }
  return entries
    .map((entry) => renderFleetTemplate(entry, tokens).trim())
    .filter(Boolean)
    .map((entry) => {
      if (!entry.includes('=')) {
        throw new Error(`Invalid ${label} entry (expected key=value): ${entry}`);
      }
      return entry;
    });
}

function usesFleetInstanceToken(value) {
  return /\$\{(index|instance|instanceId)\}/.test(String(value));
}

function appendInstanceSuffix(filePath, index) {
  const ext = path.extname(filePath);
  const base = ext ? filePath.slice(0, -ext.length) : filePath;
  return `${base}-${index}${ext}`;
}

function ensureCaptureFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fd = fs.openSync(filePath, 'a');
  fs.closeSync(fd);
}

async function startUiLiveStream({ uiUrl, source, captureId, filename, pollIntervalMs }) {
  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });
  sendWsMessage(socket, { type: 'register', role: 'agent' });
  const registered = await waitForWsAck(socket);
  if (!registered) {
    socket.close();
    throw new Error('Failed to register with the UI WebSocket.');
  }

  const requestId = buildMessageId(null, `ui-live-${captureId}`);
  sendWsMessage(socket, {
    type: 'live_start',
    source,
    captureId,
    filename,
    pollIntervalMs,
    request_id: requestId,
  });
  const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs: 4000 });
  if (!ack) {
    if (!socketClosed) {
      socket.close();
    }
    throw new Error('Timed out waiting for UI ack.');
  }
  if (!socketClosed) {
    socket.close();
  }
}

async function runFleetCapturesParallel({ plans, server, authHeader, log }) {
  return Promise.all(plans.map((plan) => runFleetCapture({ plan, server, authHeader, log })));
}

async function runFleetCapturesSequential({ plans, server, authHeader, log }) {
  const summaries = [];
  for (const plan of plans) {
    summaries.push(await runFleetCapture({ plan, server, authHeader, log }));
  }
  return summaries;
}

async function runFleetCapture({ plan, server, authHeader, log }) {
  const streamPath = resolveStreamPath(plan.stream);
  const url = streamPath.startsWith('http://') || streamPath.startsWith('https://')
    ? streamPath
    : buildUrl(server, streamPath);

  log(`Capturing ${plan.stream} -> ${plan.outputPath}`);
  const summary = await captureStream({
    url,
    outputPath: plan.outputPath,
    format: plan.format,
    maxFrames: plan.maxFrames,
    durationMs: plan.durationMs,
    componentId: plan.componentId,
    entityId: plan.entityId,
    includeAcks: plan.includeAcks,
    authHeader,
  });

  log(`Captured ${summary.recordCount} records (${summary.frameCount} frames)`);
  return {
    stream: plan.stream,
    outputPath: summary.outputPath,
    recordCount: summary.recordCount,
    frameCount: summary.frameCount,
    ackCount: summary.ackCount,
    durationMs: summary.durationMs,
  };
}

async function runFleetPlayback({ action, server, authHeader, log }) {
  const messageId = buildMessageId(null, `fleet-${action}`);
  log(`Playback ${action}`);
  await requestJson(
    buildUrl(server, `/simulation/${action}`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    },
    authHeader,
  );
}

async function applyFleetInstanceMetadata({ instanceId, labels, log }) {
  if (!instanceId || labels.length === 0) {
    return;
  }
  const args = ['instance', 'set-metadata', instanceId];
  for (const label of labels) {
    args.push('--metadata', label);
  }
  log(`Label instance (${labels.length} entries)`);
  const result = await runCommandCapture('morphcloud', args, {
    prefix: `[label:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Failed to label instance ${instanceId}`);
  }
}

async function runFleetSnapshot({ instanceId, labels, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for snapshot.');
  }
  const args = ['instance', 'snapshot', instanceId, '--json'];
  for (const label of labels) {
    args.push('--metadata', label);
  }
  log('Snapshotting instance');
  const result = await runCommandCapture('morphcloud', args, {
    prefix: `[snapshot:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Snapshot failed for ${instanceId}`);
  }
  const parsed = extractJsonFromOutput(result.stdout);
  const snapshotId = parsed?.id ?? parsed?.snapshotId ?? parsed?.snapshot_id ?? null;
  if (!snapshotId) {
    throw new Error(`Snapshot response missing id for ${instanceId}`);
  }
  return {
    id: snapshotId,
    createdAt: parsed?.created_at ?? parsed?.createdAt ?? new Date().toISOString(),
    metadata: labels,
  };
}

async function runFleetStopInstance({ instanceId, log }) {
  if (!instanceId) {
    throw new Error('Missing instance id for stop.');
  }
  log('Stopping instance');
  const result = await runCommandCapture('morphcloud', ['instance', 'stop', instanceId], {
    prefix: `[stop:${instanceId}] `,
  });
  if (result.code !== 0) {
    throw new Error(`Failed to stop instance ${instanceId}`);
  }
  return {
    status: 'stopped',
    stoppedAt: new Date().toISOString(),
  };
}

function recordFleetSnapshotState({ stateFile, instanceId, snapshot, runId }) {
  if (!stateFile || !instanceId || !snapshot) {
    return;
  }
  const state = loadMorphcloudState(stateFile);
  const record = state.instances[instanceId];
  if (!record) {
    return;
  }
  state.instances[instanceId] = {
    ...record,
    snapshotId: snapshot.id ?? null,
    snapshotCreatedAt: snapshot.createdAt ?? new Date().toISOString(),
    snapshotMetadata: snapshot.metadata ?? null,
    lastRunId: runId ?? record.lastRunId ?? null,
  };
  saveMorphcloudState(stateFile, state);
}

function recordFleetStopState({ stateFile, instanceId, forget }) {
  if (!stateFile || !instanceId) {
    return;
  }
  const state = loadMorphcloudState(stateFile);
  const record = state.instances[instanceId];
  if (!record) {
    return;
  }
  if (forget) {
    delete state.instances[instanceId];
  } else {
    state.instances[instanceId] = {
      ...record,
      stoppedAt: new Date().toISOString(),
    };
  }
  saveMorphcloudState(stateFile, state);
}

function wrapShellCommand(command) {
  const escaped = String(command)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
  return `"${escaped}"`;
}

async function runCommandCapture(command, args, { cwd, prefix } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    streamWithPrefix(child.stdout, prefix, (chunk) => {
      stdout += chunk;
    }, process.stdout);
    streamWithPrefix(child.stderr, prefix, (chunk) => {
      stderr += chunk;
    }, process.stderr);

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

function streamWithPrefix(stream, prefix, collector, target) {
  if (!stream) {
    return;
  }

  let buffer = '';
  const appliedPrefix = prefix || '';

  stream.on('data', (chunk) => {
    const text = chunk.toString();
    collector(text);
    buffer += text;

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      if (!appliedPrefix) {
        target.write(`${line}\n`);
      } else {
        target.write(`${appliedPrefix}${line}\n`);
      }
    }
  });

  stream.on('end', () => {
    if (!buffer) {
      return;
    }
    if (!appliedPrefix) {
      target.write(`${buffer}\n`);
    } else {
      target.write(`${appliedPrefix}${buffer}\n`);
    }
  });
}

function extractJsonFromOutput(output) {
  const trimmed = String(output || '').trim();
  if (!trimmed) {
    return null;
  }

  const indices = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] === '{') {
      indices.push(i);
    }
  }

  for (let i = indices.length - 1; i >= 0; i -= 1) {
    const slice = trimmed.slice(indices[i]);
    try {
      return JSON.parse(slice);
    } catch {
      // continue
    }
  }

  return null;
}

function buildAuthHeader(token) {
  const trimmed = token ? String(token).trim() : '';
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

function parseArgs(argvInput) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argvInput.length; index += 1) {
    const arg = argvInput[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (!key) {
      continue;
    }
    if (key === 'help' || key === 'h') {
      options.help = true;
      continue;
    }
    const next = argvInput[index + 1];
    if (typeof next === 'undefined' || next.startsWith('--')) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { options, positional };
}

function resolveDeployStateFile(options) {
  const candidate =
    options.state ??
    process.env.SIMEVAL_DEPLOY_STATE ??
    path.join(os.homedir(), '.simeval', 'deployments.json');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveUiStateFile(options) {
  const candidate =
    options['ui-state'] ??
    process.env.SIMEVAL_UI_STATE ??
    path.join(os.homedir(), '.simeval', 'ui.json');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveMorphcloudStateFile(options) {
  const candidate =
    options['morph-state'] ??
    process.env.SIMEVAL_MORPHCLOUD_STATE ??
    path.join(os.homedir(), '.simeval', 'morphcloud.json');
  return path.resolve(process.cwd(), String(candidate));
}

function loadDeployState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeDeployState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeDeployState({});
    }
    throw error;
  }
}

function saveDeployState(stateFile, state) {
  const normalized = normalizeDeployState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function normalizeDeployState(state) {
  const deployments =
    state && typeof state === 'object' && state.deployments && typeof state.deployments === 'object'
      ? state.deployments
      : {};
  return {
    deployments,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function loadUiState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeUiState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeUiState({});
    }
    throw error;
  }
}

function normalizeUiState(state) {
  const deployments =
    state && typeof state === 'object' && state.deployments && typeof state.deployments === 'object'
      ? state.deployments
      : {};
  return {
    deployments,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function saveUiState(stateFile, state) {
  const normalized = normalizeUiState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function loadMorphcloudState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeMorphcloudState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeMorphcloudState({});
    }
    throw error;
  }
}

function normalizeMorphcloudState(state) {
  const instances =
    state && typeof state === 'object' && state.instances && typeof state.instances === 'object'
      ? state.instances
      : {};
  return {
    instances,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function saveMorphcloudState(stateFile, state) {
  const normalized = normalizeMorphcloudState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

const BASE_PLUGIN_DIRS = new Set([
  'plugins',
  'plugins/simulation',
  'plugins/simulation/components',
  'plugins/simulation/systems',
  'plugins/simulation/operations',
  'plugins/evaluation',
  'plugins/evaluation/components',
  'plugins/evaluation/systems',
  'plugins/evaluation/operations',
]);

function cleanPluginDirectories(workspaceDir) {
  const pluginsDir = path.join(workspaceDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  }

  const stats = fs.statSync(pluginsDir);
  if (!stats.isDirectory()) {
    return { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  }

  const summary = { removedFiles: 0, removedDirs: 0, skippedFiles: 0 };
  cleanDirectoryRecursive(pluginsDir, workspaceDir, summary);
  return summary;
}

function cleanDirectoryRecursive(targetDir, workspaceDir, summary) {
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const relative = path.relative(workspaceDir, targetDir).split(path.sep).join('/');
  const isBaseDir = BASE_PLUGIN_DIRS.has(relative);

  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      cleanDirectoryRecursive(entryPath, workspaceDir, summary);
      const remaining = fs.readdirSync(entryPath);
      const relChild = path.relative(workspaceDir, entryPath).split(path.sep).join('/');
      const childIsBase = BASE_PLUGIN_DIRS.has(relChild);
      if (!childIsBase && remaining.length === 0) {
        fs.rmdirSync(entryPath);
        summary.removedDirs += 1;
      }
      continue;
    }

    if (entry.isFile() && entry.name === '.gitkeep' && isBaseDir) {
      summary.skippedFiles += 1;
      continue;
    }

    fs.unlinkSync(entryPath);
    summary.removedFiles += 1;
  }
}

function resolveWorkspaceDir(options) {
  if (options.workspace) {
    const resolved = path.resolve(process.cwd(), String(options.workspace));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  if (CLI_CONFIG?.data?.workspace) {
    const resolved = path.resolve(CLI_CONFIG.dir ?? process.cwd(), String(CLI_CONFIG.data.workspace));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  if (process.env.SIMEVAL_WORKSPACE) {
    const resolved = path.resolve(process.cwd(), String(process.env.SIMEVAL_WORKSPACE));
    if (!fs.existsSync(resolved)) {
      throw new Error(`Workspace not found: ${resolved}`);
    }
    return resolved;
  }

  const resolved = path.resolve(__dirname, '..', '..', 'workspaces', 'Describing_Simulation_0');
  if (!fs.existsSync(resolved)) {
    throw new Error(`Workspace not found: ${resolved}`);
  }
  return resolved;
}

function resolveDeployHost(options) {
  return String(options.host ?? process.env.SIMEVAL_HOST ?? '127.0.0.1');
}

function resolveLogDir(options) {
  const candidate = options['log-dir'] ?? process.env.SIMEVAL_LOG_DIR ?? path.join(os.homedir(), '.simeval', 'logs');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveCliLogDir(options) {
  const candidate =
    options['log-dir'] ??
    process.env.SIMEVAL_CLI_LOG_DIR ??
    path.join(os.homedir(), '.simeval', 'logs', 'cli');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveCliLogFile(options, type) {
  if (options.log) {
    return path.resolve(process.cwd(), String(options.log));
  }
  const logDir = resolveCliLogDir(options);
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  return path.join(logDir, `${type}_${timestamp}.log`);
}

function spawnDetachedProcess({ command, args, cwd, env, logFile }) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  if (!child.pid) {
    throw new Error('Failed to spawn background process.');
  }
  return child.pid;
}

function resolveLogFile(options, logDir, port) {
  if (options.log) {
    return path.resolve(process.cwd(), String(options.log));
  }
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  return path.join(logDir, `simeval_${port}_${timestamp}.log`);
}

function resolveBuildMode(options) {
  if (options['no-build']) {
    return 'never';
  }
  if (options.build) {
    return 'always';
  }
  return 'always';
}

function resolveAutoStartEvaluation(options) {
  if (options['no-auto-start-eval']) {
    return false;
  }
  return parseBooleanOption(options['auto-start-eval'], true);
}

function buildStreamForwardArgs({ options, streamInput, uiUrl }) {
  const args = [__filename, 'stream', 'forward', '--foreground'];
  const streamValue = options.stream || streamInput;
  if (streamValue) {
    args.push('--stream', String(streamValue));
  }
  if (options.frames) {
    args.push('--frames', String(options.frames));
  }
  if (options.duration) {
    args.push('--duration', String(options.duration));
  }
  if (options.component) {
    args.push('--component', String(options.component));
  }
  if (options.entity) {
    args.push('--entity', String(options.entity));
  }
  if (options['capture-id']) {
    args.push('--capture-id', String(options['capture-id']));
  }
  if (options.filename || options.name) {
    args.push('--filename', String(options.filename || options.name));
  }
  if (options.server) {
    args.push('--server', String(options.server));
  }
  if (options.token) {
    args.push('--token', String(options.token));
  }
  args.push('--ui', String(uiUrl));
  return args;
}

function listCliLogs(logDir, typeFilter) {
  if (!fs.existsSync(logDir)) {
    return [];
  }
  const entries = fs.readdirSync(logDir)
    .filter((entry) => entry.endsWith('.log'))
    .filter((entry) => (typeFilter ? entry.startsWith(`${typeFilter}_`) : true))
    .map((entry) => {
      const fullPath = path.join(logDir, entry);
      const stat = fs.statSync(fullPath);
      return {
        name: entry,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
  return entries;
}

function resolveCliLogTarget(logDir, target, typeFilter) {
  const resolved = path.isAbsolute(target) ? target : path.join(logDir, target);
  if (fs.existsSync(resolved)) {
    return resolved;
  }
  const prefix = typeFilter ? `${typeFilter}_${target}` : target;
  const matches = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter((entry) => entry.startsWith(prefix))
    : [];
  if (matches.length === 0) {
    throw new Error(`Log not found: ${target}`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple logs match: ${matches.join(', ')}`);
  }
  return path.join(logDir, matches[0]);
}

function parseBooleanOption(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  const normalized = String(value).toLowerCase().trim();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

async function deployStart(options) {
  const port = parseOptionalNumber(options.port, 'port') ?? 3000;
  const host = resolveDeployHost(options);
  const workspace = resolveWorkspaceDir(options);
  const distMain = path.join(workspace, 'dist', 'main.js');
  const buildMode = resolveBuildMode(options);
  const autoStartEvaluation = resolveAutoStartEvaluation(options);
  const logDir = resolveLogDir(options);
  const logFile = resolveLogFile(options, logDir, port);
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const cleanPlugins = Boolean(options['clean-plugins']);
  const waitForReady = parseBooleanOption(options.wait, false);
  const waitTimeoutMs = parseOptionalNumber(options['wait-timeout'], 'wait-timeout') ?? 30000;
  const waitIntervalMs = parseOptionalNumber(options['wait-interval'], 'wait-interval') ?? 500;

  if (state.deployments[String(port)] && isProcessAlive(state.deployments[String(port)].pid)) {
    if (!options.force) {
      throw new Error(`Port ${port} already has a running deployment. Use --force to replace.`);
    }
  }

  delete state.deployments[String(port)];

  await ensureBuild(buildMode, workspace, distMain);

  const cleanSummary = cleanPlugins ? cleanPluginDirectories(workspace) : null;

  const env = {
    ...process.env,
    SIMEVAL_PORT: String(port),
    SIMEVAL_HOST: host,
    SIMEVAL_AUTO_START_EVALUATION: autoStartEvaluation ? 'true' : 'false',
  };

  const pid = spawnServer(distMain, workspace, env, logFile);
  const record = {
    pid,
    host,
    port,
    workspace,
    logFile,
    startedAt: new Date().toISOString(),
  };

  state.deployments[String(port)] = record;
  saveDeployState(stateFile, state);

  if (waitForReady) {
    await waitForDeployReady({
      pid,
      host,
      port,
      timeoutMs: waitTimeoutMs,
      intervalMs: waitIntervalMs,
    });
  }

  printJson({
    status: 'started',
    ...record,
    cleanPlugins: cleanSummary,
    stateFile,
  });
}

async function deployStop(options) {
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const signal = typeof options.signal === 'string' ? options.signal : 'SIGTERM';
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const results = [];

  if (options.all) {
    for (const [key, record] of Object.entries(state.deployments)) {
      const result = await stopDeployment(record, signal, timeoutMs);
      results.push(result);
      delete state.deployments[key];
    }
  } else if (options.pid) {
    const pid = parseOptionalNumber(options.pid, 'pid');
    if (!pid) {
      throw new Error('Missing --pid for deploy stop.');
    }
    const matchKey = Object.keys(state.deployments).find(
      (key) => Number(state.deployments[key]?.pid) === pid,
    );
    const record = matchKey ? state.deployments[matchKey] : { pid };
    results.push(await stopDeployment(record, signal, timeoutMs));
    if (matchKey) {
      delete state.deployments[matchKey];
    }
  } else {
    const port = parseOptionalNumber(options.port, 'port');
    if (!port) {
      throw new Error('Missing --port for deploy stop.');
    }
    const record = state.deployments[String(port)];
    if (!record) {
      throw new Error(`No deployment recorded for port ${port}.`);
    }
    results.push(await stopDeployment(record, signal, timeoutMs));
    delete state.deployments[String(port)];
  }

  saveDeployState(stateFile, state);
  printJson({
    status: 'stopped',
    stateFile,
    results,
  });
}

function deployList(options) {
  const stateFile = resolveDeployStateFile(options);
  const state = loadDeployState(stateFile);
  const deployments = Object.values(state.deployments).sort((a, b) => {
    const aPort = Number(a.port ?? 0);
    const bPort = Number(b.port ?? 0);
    return aPort - bPort;
  });
  printJson({
    stateFile,
    deployments,
  });
}

function spawnServer(entrypoint, workspace, env, logFile) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const logFd = fs.openSync(logFile, 'a');
  const child = spawn('node', [entrypoint], {
    cwd: workspace,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  fs.closeSync(logFd);
  if (!child.pid) {
    throw new Error('Failed to start SimEval process.');
  }
  return child.pid;
}

async function waitForDeployReady({ pid, host, port, timeoutMs, intervalMs }) {
  const url = buildUrl(resolveDeployHealthHost(host, port), '/health');
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      throw new Error('Deploy process exited before health check passed.');
    }
    try {
      await requestJson(url, { method: 'GET' });
      return;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Timed out waiting for deployment health check: ${message}`);
}

function resolveDeployHealthHost(host, port) {
  const normalizedHost = String(host || '').trim();
  const resolvedHost = normalizedHost === '0.0.0.0' ? '127.0.0.1' : normalizedHost;
  return `http://${resolvedHost}:${port}/api`;
}

async function ensureBuild(mode, workspace, distMain) {
  const exists = fs.existsSync(distMain);
  if (mode === 'never') {
    if (!exists) {
      throw new Error('dist/main.js not found. Run a build or omit --no-build.');
    }
    return;
  }
  if (mode === 'auto' && exists) {
    return;
  }
  await runCommand('npm', ['--prefix', workspace, 'run', 'build'], { cwd: workspace });
  if (!fs.existsSync(distMain)) {
    throw new Error('Build completed but dist/main.js is still missing.');
  }
}

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

async function stopDeployment(record, signal, timeoutMs) {
  const pid = Number(record?.pid);
  if (!Number.isFinite(pid)) {
    return { status: 'missing-pid', pid: null, record };
  }

  if (!isProcessAlive(pid)) {
    return { status: 'not-running', pid, record };
  }

  try {
    process.kill(pid, signal);
  } catch (error) {
    if (error && error.code !== 'ESRCH') {
      throw error;
    }
  }

  let stopped = await waitForExit(pid, timeoutMs);
  if (!stopped && signal !== 'SIGKILL') {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (error) {
      if (error && error.code !== 'ESRCH') {
        throw error;
      }
    }
    stopped = await waitForExit(pid, 1000);
  }

  return { status: stopped ? 'stopped' : 'signal-sent', pid, record };
}

function isProcessAlive(pid) {
  if (!Number.isFinite(pid)) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === 'ESRCH') {
      return false;
    }
    if (error && error.code === 'EPERM') {
      return true;
    }
    return false;
  }
}

async function waitForExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await delay(100);
  }
  return !isProcessAlive(pid);
}

function resolveServerUrl(options, runContext) {
  const candidate =
    (options.server ??
      runContext?.data?.server ??
      CLI_CONFIG?.data?.server ??
      process.env.SIMEVAL_SERVER_URL ??
      process.env.SIMEVAL_BASE_URL ??
      'http://127.0.0.1:3000/api') || '';
  const trimmed = String(candidate).trim();
  if (!trimmed) {
    throw new Error('Missing server URL. Pass --server or set SIMEVAL_SERVER_URL.');
  }
  return trimmed.replace(/\/+$/, '');
}

function resolveAuthHeader(options) {
  const raw =
    options.token ??
    CLI_CONFIG?.data?.token ??
    process.env.SIMEVAL_AUTH_TOKEN ??
    process.env.SIMEVAL_API_TOKEN ??
    '';
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
}

function resolveUiServeOptions(options) {
  const host =
    String(
      options['ui-host'] ??
        options.host ??
        CLI_CONFIG?.data?.uiHost ??
        DEFAULT_UI_HOST,
    ).trim() || DEFAULT_UI_HOST;
  const port =
    parseOptionalNumber(
      options['ui-port'] ?? options.port ?? CLI_CONFIG?.data?.uiPort,
      'ui-port',
    ) ?? DEFAULT_UI_PORT;
  const mode = normalizeUiServeMode(
    options['ui-mode'] ?? CLI_CONFIG?.data?.uiMode ?? 'dev',
  );
  const uiDir = resolveUiDirectory(options['ui-dir'], CLI_CONFIG?.data?.uiDir);
  const timeoutMs = parseOptionalNumber(options.timeout, 'timeout') ?? 5000;
  const skipInstall = Boolean(options['skip-install'] ?? options['no-install']);

  return {
    host,
    port,
    mode,
    uiDir,
    timeoutMs,
    skipInstall,
  };
}

function resolveUiShutdownUrl(options) {
  const uiInput = resolveUiInput(options, 'ui shutdown');
  if (uiInput) {
    const httpUrl = normalizeUiHttpUrl(uiInput);
    if (!httpUrl) {
      throw new Error('Invalid --ui value. Provide a ws:// or http(s):// URL.');
    }
    return httpUrl;
  }
  const host =
    String(
      options['ui-host'] ??
        options.host ??
        CLI_CONFIG?.data?.uiHost ??
        DEFAULT_UI_HOST,
    ).trim() || DEFAULT_UI_HOST;
  const port =
    parseOptionalNumber(
      options['ui-port'] ?? options.port ?? CLI_CONFIG?.data?.uiPort,
      'ui-port',
    ) ?? DEFAULT_UI_PORT;
  return `http://${host}:${port}`;
}

function resolveUiInput(options, contextLabel = 'ui') {
  const explicit =
    options.ui ||
    options.ws ||
    options['ui-url'] ||
    options['ws-url'];
  if (explicit) {
    return explicit;
  }
  if (CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (${contextLabel}): ${CLI_CONFIG.data.uiUrl}`);
    return CLI_CONFIG.data.uiUrl;
  }
  if (CLI_CONFIG?.data?.uiHost || CLI_CONFIG?.data?.uiPort) {
    const host = String(CLI_CONFIG?.data?.uiHost ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port =
      parseOptionalNumber(CLI_CONFIG?.data?.uiPort, 'ui-port') ?? DEFAULT_UI_PORT;
    console.log(`[ui] using default ui host/port (${contextLabel}): ${host}:${port}`);
    return `http://${host}:${port}`;
  }
  return '';
}

function resolveUiStatusTarget(options) {
  const explicit =
    options.ui ||
    options.ws ||
    options['ui-url'] ||
    options['ws-url'];
  if (explicit) {
    return {
      input: explicit,
      url: normalizeUiHttpUrl(explicit),
      source: 'explicit',
    };
  }

  const hostInput = options['ui-host'] ?? options.host;
  const portInput = options['ui-port'] ?? options.port;
  if (hostInput || portInput) {
    const host = String(hostInput ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port = parseOptionalNumber(portInput, 'ui-port') ?? DEFAULT_UI_PORT;
    return {
      input: `${host}:${port}`,
      url: `http://${host}:${port}`,
      source: 'host-port',
    };
  }

  if (CLI_CONFIG?.data?.uiUrl) {
    console.log(`[ui] using default ui url (status): ${CLI_CONFIG.data.uiUrl}`);
    return {
      input: CLI_CONFIG.data.uiUrl,
      url: normalizeUiHttpUrl(CLI_CONFIG.data.uiUrl),
      source: 'config',
    };
  }

  if (CLI_CONFIG?.data?.uiHost || CLI_CONFIG?.data?.uiPort) {
    const host = String(CLI_CONFIG?.data?.uiHost ?? DEFAULT_UI_HOST).trim() || DEFAULT_UI_HOST;
    const port =
      parseOptionalNumber(CLI_CONFIG?.data?.uiPort, 'ui-port') ?? DEFAULT_UI_PORT;
    console.log(`[ui] using default ui host/port (status): ${host}:${port}`);
    return {
      input: `${host}:${port}`,
      url: `http://${host}:${port}`,
      source: 'config-host-port',
    };
  }

  console.log(`[ui] using default ui host/port (status): ${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`);
  return {
    input: `${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`,
    url: `http://${DEFAULT_UI_HOST}:${DEFAULT_UI_PORT}`,
    source: 'default',
  };
}

function buildUiKey(host, port) {
  const normalizedHost = String(host ?? '').trim() || DEFAULT_UI_HOST;
  const normalizedPort = String(port ?? '').trim();
  if (!normalizedPort) {
    return null;
  }
  return `${normalizedHost}:${normalizedPort}`;
}

function buildUiKeyFromUrl(url) {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.port) {
      return null;
    }
    return `${parsed.hostname}:${parsed.port}`;
  } catch (_error) {
    return null;
  }
}

function resolveUiDirectory(explicitDir, configDir) {
  if (explicitDir) {
    const resolved = path.resolve(process.cwd(), String(explicitDir));
    return assertUiDirectory(resolved, '--ui-dir');
  }
  if (configDir) {
    const resolved = path.resolve(process.cwd(), String(configDir));
    return assertUiDirectory(resolved, 'uiDir');
  }
  const defaultDir = path.resolve(process.cwd(), DEFAULT_UI_DIRNAME);
  return assertUiDirectory(defaultDir, DEFAULT_UI_DIRNAME);
}

function assertUiDirectory(candidate, sourceLabel) {
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `Metrics UI directory not found (${sourceLabel}: ${candidate}). ` +
        'Pass --ui-dir or set uiDir in ~/.simeval/config.json.',
    );
  }
  const stats = fs.statSync(candidate);
  if (!stats.isDirectory()) {
    throw new Error(`Metrics UI path is not a directory (${candidate}).`);
  }
  const packageJson = path.join(candidate, 'package.json');
  if (!fs.existsSync(packageJson)) {
    throw new Error(`Metrics UI package.json missing at ${packageJson}.`);
  }
  return candidate;
}

async function ensureUiDependencies(uiDir, skipInstall) {
  const nodeModules = path.join(uiDir, 'node_modules');
  if (fs.existsSync(nodeModules)) {
    return;
  }
  if (skipInstall) {
    throw new Error(`Missing node_modules in ${uiDir}. Run npm install or omit --skip-install.`);
  }
  console.log(`[ui] installing dependencies in ${uiDir}`);
  await runCommand('npm', ['--prefix', uiDir, 'install'], { cwd: uiDir });
}

async function probeUiServer({ host, port, timeoutMs }) {
  const url = `http://${host}:${port}/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const wsHeader = response.headers.get('x-metrics-ui-agent-ws');
    return {
      running: true,
      isUi: Boolean(wsHeader),
      url,
    };
  } catch (error) {
    return {
      running: false,
      isUi: false,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeUiHttpUrl(url, timeoutMs) {
  if (!url) {
    return {
      running: false,
      isUi: false,
      url: null,
      error: 'UI url missing.',
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const wsHeader = response.headers.get('x-metrics-ui-agent-ws');
    return {
      running: true,
      isUi: Boolean(wsHeader),
      url,
      wsHeader: wsHeader || null,
    };
  } catch (error) {
    return {
      running: false,
      isUi: false,
      url,
      error: error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUiServeMode(value) {
  const normalized = String(value || 'dev').toLowerCase();
  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }
  if (normalized === 'start' || normalized === 'prod' || normalized === 'production') {
    return 'start';
  }
  throw new Error('Invalid --ui-mode value. Use dev or start.');
}

function readCliConfigFile(configPath) {
  if (!fs.existsSync(configPath)) {
    return { data: {}, exists: false };
  }

  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read CLI config: ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse CLI config JSON: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('CLI config must be a JSON object.');
  }

  return { data: parsed, exists: true };
}

function redactCliConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }

  const redacted = { ...config };
  ['token', 'authToken', 'apiToken', 'morphApiKey'].forEach((key) => {
    if (redacted[key]) {
      redacted[key] = '<redacted>';
    }
  });
  return redacted;
}

function readConfigOption(options, key, label) {
  if (!Object.prototype.hasOwnProperty.call(options, key)) {
    return null;
  }
  const value = options[key];
  if (value === true) {
    throw new Error(`Missing value for ${label}.`);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw new Error(`Missing value for ${label}.`);
  }
  return trimmed;
}

function buildUrl(server, endpointPath) {
  if (!endpointPath) {
    return server;
  }
  if (endpointPath.startsWith('http://') || endpointPath.startsWith('https://')) {
    return endpointPath;
  }
  const normalized = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  return `${server}${normalized}`;
}

async function safeRequestJson(url, authHeader, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      url,
      applyAuth({ method: 'GET', signal: controller.signal }, authHeader),
    );
    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: text || `Request failed (${response.status})`,
      };
    }
    if (!text) {
      return { ok: true, status: response.status, data: null };
    }
    try {
      return { ok: true, status: response.status, data: JSON.parse(text) };
    } catch (error) {
      return {
        ok: false,
        status: response.status,
        error: `Invalid JSON response: ${error?.message ?? error}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error?.name === 'AbortError' ? 'Request timed out' : error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function requestJson(url, init, authHeader) {
  const response = await fetch(url, applyAuth(init ?? {}, authHeader));
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function requestJsonWithStatus(url, init, authHeader) {
  const response = await fetch(url, applyAuth(init ?? {}, authHeader));
  const text = await response.text().catch(() => '');
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`Request failed (${response.status}): ${detail}`);
  }
  return { status: response.status, data };
}

function applyAuth(init, authHeader) {
  if (!authHeader) {
    return init;
  }
  const headers = { ...(init.headers ?? {}), Authorization: authHeader };
  return { ...init, headers };
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function normalizePlayer(value) {
  const normalized = String(value || 'simulation').toLowerCase();
  if (normalized === 'evaluation' || normalized === 'eval') {
    return 'evaluation';
  }
  return 'simulation';
}

function resolveStreamPath(stream) {
  const normalized = String(stream || '').toLowerCase();
  if (!normalized || normalized === 'simulation' || normalized === 'sim') {
    return '/simulation/stream';
  }
  if (normalized === 'evaluation' || normalized === 'eval') {
    return '/evaluation/stream';
  }
  if (normalized.startsWith('/')) {
    return normalized;
  }
  return `/${normalized}`;
}

function parseOptionalNumber(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${label} value. Expected a positive number.`);
  }
  return parsed;
}

function parseOptionalInteger(value, label, options = {}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  const min = Number.isFinite(options.min) ? Number(options.min) : 0;
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`Invalid --${label} value. Expected an integer >= ${min}.`);
  }
  return parsed;
}

function parseOptionalJson(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  try {
    return JSON.parse(String(value));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid --${label} JSON: ${message}`);
  }
}

function parsePathInput(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid --path JSON. Expected an array.');
    }
    return parsed.map((segment) => String(segment));
  }
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return raw
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildMessageId(runId, suffix) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const prefix = runId ? `${runId}` : 'cli';
  return `${prefix}-${suffix}-${timestamp}`;
}

function buildRunId() {
  return `run-${new Date().toISOString().replace(/[-:.]/g, '')}`;
}

function buildCaptureId() {
  return `capture-${new Date().toISOString().replace(/[-:.]/g, '')}`;
}

function resolveRunsRoot(options) {
  const candidate = options['runs-dir'] ?? process.env.SIMEVAL_RUNS_DIR ?? path.join(process.cwd(), 'runs');
  return path.resolve(process.cwd(), String(candidate));
}

function resolveRunContext(options) {
  const runValue = options.run;
  if (!runValue) {
    return null;
  }
  const resolved = path.resolve(process.cwd(), String(runValue));
  const runDir = resolved.endsWith('run.json') ? path.dirname(resolved) : resolved;
  const metadata = readRunMetadata(runDir);
  return { dir: runDir, data: metadata, id: metadata.id };
}

function readRunMetadata(runDir) {
  const filename = path.join(runDir, 'run.json');
  const raw = fs.readFileSync(filename, 'utf8');
  return JSON.parse(raw);
}

function writeRunMetadata(runDir, data) {
  const updated = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  return updated;
}

function createRunMetadata({ id, name, server, notes }) {
  const now = new Date().toISOString();
  return {
    id,
    name: name || id,
    server,
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
    events: [],
    captures: [],
  };
}

function recordRunEvent(runContext, event) {
  const run = { ...runContext.data };
  const events = Array.isArray(run.events) ? run.events.slice() : [];
  events.push({ timestamp: new Date().toISOString(), ...event });
  run.events = events;
  runContext.data = writeRunMetadata(runContext.dir, run);
}

function recordRunCapture(runContext, capture) {
  const run = { ...runContext.data };
  const captures = Array.isArray(run.captures) ? run.captures.slice() : [];
  captures.push({ timestamp: new Date().toISOString(), ...capture });
  run.captures = captures;
  runContext.data = writeRunMetadata(runContext.dir, run);
}

function inferPluginPath(sourcePath) {
  const normalized = sourcePath.split(path.sep).join('/');
  const marker = '/plugins/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) {
    return '';
  }
  return normalized.slice(index + 1);
}

function resolveCapturePath(requested, runContext, streamInput, format) {
  if (requested) {
    return path.resolve(process.cwd(), String(requested));
  }

  const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
  const streamLabel = String(streamInput || 'stream').replace(/[^a-z0-9_-]+/gi, '_');
  const filename = `${streamLabel}_${timestamp}.${format === 'json' ? 'json' : 'jsonl'}`;

  if (runContext) {
    const capturesDir = path.join(runContext.dir, 'captures');
    fs.mkdirSync(capturesDir, { recursive: true });
    return path.join(capturesDir, filename);
  }

  return path.join(process.cwd(), filename);
}

async function captureStream({
  url,
  outputPath,
  format,
  maxFrames,
  durationMs,
  componentId,
  entityId,
  includeAcks,
  authHeader,
}) {
  const headers = {
    Accept: 'text/event-stream',
    'User-Agent': 'simeval-cli/1.0',
  };
  const controller = new AbortController();
  if (durationMs) {
    setTimeout(() => controller.abort(), durationMs);
  }

  const response = await fetch(url, applyAuth({ headers, signal: controller.signal }, authHeader));
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let frameCount = 0;
  let ackCount = 0;
  let recordCount = 0;
  let stop = false;

  const writer = createRecordWriter(outputPath, format);

  try {
    while (!stop) {
      const result = await reader.read();
      if (!result || result.done) {
        break;
      }
      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
        const processed = processSseBuffer(buffer, (message) => {
          if (componentId) {
            if (!isFrameMessage(message)) {
              return true;
            }
            const filtered = filterFrame(message, componentId, entityId);
            if (!filtered) {
              return true;
            }
            frameCount += 1;
            writer.write(filtered);
            recordCount += 1;
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (isFrameMessage(message)) {
            frameCount += 1;
            writer.write(message);
            recordCount += 1;
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (includeAcks && isAckMessage(message)) {
            ackCount += 1;
            writer.write(message);
            recordCount += 1;
          }
          return true;
        });
        buffer = processed.buffer;
        if (processed.stop) {
          stop = true;
        }
      }
    }
  } catch (error) {
    if (!(controller.signal.aborted && error.name === 'AbortError')) {
      throw error;
    }
  } finally {
    controller.abort();
    await reader.cancel().catch(() => undefined);
    await writer.close();
  }

  return {
    outputPath,
    recordCount,
    frameCount,
    ackCount,
    durationMs: durationMs ?? null,
  };
}

function normalizeUiWsUrl(value) {
  if (!value) {
    return '';
  }
  const input = String(value).trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    return input;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const parsed = new URL(input);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/ws/control';
    }
    return parsed.toString();
  }
  const trimmed = input.replace(/\/+$/, '');
  return `ws://${trimmed}/ws/control`;
}

function normalizeUiHttpUrl(value) {
  if (!value) {
    return '';
  }
  const input = String(value).trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    const parsed = new URL(input);
    parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    return parsed.origin;
  }
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const parsed = new URL(input);
    return parsed.origin;
  }
  const trimmed = input.replace(/\/+$/, '');
  return `http://${trimmed}`;
}

function resolveUiWsFromHeader(headerValue, httpUrl) {
  if (!headerValue) {
    return '';
  }
  const trimmed = String(headerValue).trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed;
  }
  const base = new URL(httpUrl);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.search = '';
  base.hash = '';
  if (trimmed.startsWith('/')) {
    base.pathname = trimmed;
    return base.toString();
  }
  base.pathname = `/${trimmed.replace(/^\/+/, '')}`;
  return base.toString();
}

async function resolveUiWsUrl(value) {
  const normalized = normalizeUiWsUrl(value);
  if (!normalized) {
    return '';
  }
  const input = String(value ?? '').trim();
  if (!input) {
    return '';
  }
  if (input.startsWith('ws://') || input.startsWith('wss://')) {
    return normalized;
  }
  const httpUrl = normalizeUiHttpUrl(value);
  if (!httpUrl) {
    return normalized;
  }
  try {
    const response = await fetch(httpUrl, { method: 'HEAD' });
    const headerValue = response.headers.get('x-metrics-ui-agent-ws');
    const resolved = resolveUiWsFromHeader(headerValue, httpUrl);
    if (resolved) {
      return resolved;
    }
  } catch {
    // fall back to normalized ws url
  }
  return normalized;
}

async function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const onOpen = () => {
      cleanup();
      resolve(socket);
    };
    const onError = (error) => {
      cleanup();
      reject(error ?? new Error(`WebSocket connection failed (${url})`));
    };
    const cleanup = () => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
    };
    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
  });
}

function sendWsMessage(socket, payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }
  socket.send(JSON.stringify(payload));
  return true;
}

function attachWsErrorLogger(socket, { captureId, label }) {
  let lastError = null;
  const tag = label ? `[${label}] ` : '';
  const onMessage = (event) => {
    const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
    if (!raw) {
      return;
    }
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || (message.type !== 'error' && message.type !== 'ui_error')) {
      return;
    }
    const contextCaptureId = message.payload?.context?.captureId;
    if (captureId && contextCaptureId && contextCaptureId !== captureId) {
      return;
    }
    const errorText = message.error || 'WebSocket error';
    const displayType = message.type === 'ui_error' ? 'ui error' : 'ws error';
    lastError = new Error(errorText);
    console.error(`[simeval-cli] ${tag}${displayType}: ${errorText}`);
  };
  socket.addEventListener('message', onMessage);
  return () => {
    socket.removeEventListener('message', onMessage);
    return lastError;
  };
}

async function waitForWsAck(socket, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    const onMessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
      if (!raw) {
        return;
      }
      try {
        const message = JSON.parse(raw);
        if (message && message.type === 'ack') {
          cleanup();
          resolve(true);
        }
        if (message && message.type === 'error') {
          cleanup();
          resolve(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    const onError = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
  });
}

async function waitForWsResponse(socket, { requestId, types, timeoutMs = 2000 }) {
  const typeSet = new Set(types || []);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    const onMessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
      if (!raw) {
        return;
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }
      if (message && message.type === 'error') {
        if (!requestId || message.request_id === requestId) {
          cleanup();
          reject(new Error(message.error || 'WebSocket error'));
        }
        return;
      }
      if (requestId && message?.request_id !== requestId) {
        return;
      }
      if (typeSet.size > 0 && !typeSet.has(message?.type)) {
        return;
      }
      cleanup();
      resolve(message);
    };

    const onError = (error) => {
      cleanup();
      reject(error ?? new Error('WebSocket error'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('error', onError);
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
  });
}

async function waitForUiAckOrThrow(socket, { requestId, timeoutMs = 2000, errorMessage }) {
  const ack = await waitForWsResponse(socket, { requestId, types: ['ack'], timeoutMs });
  if (!ack) {
    throw new Error(errorMessage || 'Timed out waiting for UI ack.');
  }
  return ack;
}

async function waitForDerivationCompletionOrThrow(
  socket,
  { requestId, timeoutMs = 30000, actionLabel = 'derivation run' },
) {
  let response;
  try {
    response = await waitForWsResponse(socket, {
      requestId,
      types: ['ui_notice', 'ui_error'],
      timeoutMs,
    });
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : `Failed while waiting for ${actionLabel} completion.`,
    );
  }
  if (!response) {
    throw new Error(`Timed out waiting for ${actionLabel} completion.`);
  }
  if (response.type === 'ui_error') {
    throw new Error(response.error || `UI reported ${actionLabel} failure.`);
  }
  return response;
}

async function traceUiRequest(
  socket,
  {
    requestId,
    timeoutMs = 30000,
    includeAck = true,
    sendCommand = null,
  },
) {
  const startMs = Date.now();
  const startIso = new Date(startMs).toISOString();
  return new Promise((resolve) => {
    let settled = false;
    const timeline = [];

    const finish = (status, extra = {}) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      const endMs = Date.now();
      resolve({
        status,
        requestId,
        startedAt: startIso,
        finishedAt: new Date(endMs).toISOString(),
        elapsedMs: Math.max(0, endMs - startMs),
        eventCount: timeline.length,
        events: timeline,
        ...extra,
      });
    };

    const timer = setTimeout(() => {
      finish('timeout');
    }, timeoutMs);

    const onMessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : event.data?.toString();
      if (!raw) {
        return;
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return;
      }
      if (!message || message.request_id !== requestId) {
        return;
      }

      const type = typeof message.type === 'string' ? message.type : '';
      if (!includeAck && type === 'ack') {
        return;
      }
      if (
        type !== 'ack'
        && type !== 'ui_notice'
        && type !== 'ui_error'
        && type !== 'error'
      ) {
        return;
      }

      const nowMs = Date.now();
      const entry = {
        type,
        at: new Date(nowMs).toISOString(),
        elapsedMs: Math.max(0, nowMs - startMs),
      };
      if (type === 'ack') {
        entry.command = message?.payload?.command ?? null;
      } else if (type === 'ui_notice') {
        entry.message = message?.payload?.message ?? null;
        entry.context = message?.payload?.context ?? null;
      } else {
        entry.error = message?.error ?? null;
        entry.context = message?.payload?.context ?? null;
      }
      timeline.push(entry);

      if (type === 'ui_notice') {
        finish('completed', { completionType: 'ui_notice' });
        return;
      }
      if (type === 'ui_error' || type === 'error') {
        finish('failed', { completionType: type });
      }
    };

    const onClose = (event) => {
      finish('socket_closed', {
        closeCode: event?.code ?? null,
        closeReason: event?.reason || null,
      });
    };

    const onError = (error) => {
      finish('socket_error', {
        error: error?.message ?? String(error ?? 'WebSocket error'),
      });
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      socket.removeEventListener('close', onClose);
      socket.removeEventListener('error', onError);
    };

    socket.addEventListener('message', onMessage);
    socket.addEventListener('close', onClose);
    socket.addEventListener('error', onError);

    if (sendCommand && typeof sendCommand === 'object') {
      const outbound = { ...sendCommand, request_id: requestId };
      const sent = sendWsMessage(socket, outbound);
      if (!sent) {
        finish('send_failed', {
          error: 'WebSocket is not open.',
          sentCommand: outbound,
        });
        return;
      }
      timeline.push({
        type: 'trace_sent',
        at: new Date(Date.now()).toISOString(),
        elapsedMs: 0,
        commandType: outbound.type ?? null,
      });
    }
  });
}

function compressConsecutiveRanges(list) {
  const sorted = [...list].sort((a, b) => a - b);
  const ranges = [];
  for (const value of sorted) {
    if (!ranges.length || value !== ranges[ranges.length - 1][1] + 1) {
      ranges.push([value, value]);
    } else {
      ranges[ranges.length - 1][1] = value;
    }
  }
  return ranges;
}

function findMissingTickRanges(sortedValues) {
  const gaps = [];
  for (let i = 1; i < sortedValues.length; i += 1) {
    const prev = sortedValues[i - 1];
    const next = sortedValues[i];
    if (next > prev + 1) {
      gaps.push([prev + 1, next - 1]);
    }
  }
  return gaps;
}

async function collectUiCheckReport(
  socket,
  {
    captureId = null,
    windowSize = undefined,
    windowStart = undefined,
    windowEnd = undefined,
    timeoutMs = 5000,
    requestIdBase = null,
  } = {},
) {
  const idPrefix = requestIdBase || buildMessageId(null, 'ui-check');
  const stateRequestId = `${idPrefix}-state`;
  sendWsMessage(socket, { type: 'get_state', request_id: stateRequestId });
  const stateResponse = await waitForWsResponse(socket, {
    requestId: stateRequestId,
    types: ['state_update'],
    timeoutMs: timeoutMs + 2000,
  });
  if (!stateResponse) {
    throw new Error('Timed out waiting for UI state.');
  }
  const state = stateResponse.payload ?? stateResponse;
  const stateWindowStart = typeof state.windowStart === 'number' ? state.windowStart : 1;
  const stateWindowSize = typeof state.windowSize === 'number' ? state.windowSize : 1;
  const stateWindowEnd =
    typeof state.windowEnd === 'number'
      ? state.windowEnd
      : Math.max(1, stateWindowStart + Math.max(1, stateWindowSize) - 1);
  const captures = Array.isArray(state.captures) ? state.captures : [];
  const selectedMetrics = Array.isArray(state.selectedMetrics) ? state.selectedMetrics : [];
  const targetCaptureIds = captureId
    ? [String(captureId)]
    : captures.map((capture) => capture.id);

  const debugRequestId = `${idPrefix}-render-debug`;
  sendWsMessage(socket, {
    type: 'get_render_debug',
    captureId: captureId ? String(captureId) : undefined,
    windowSize: windowSize ?? undefined,
    windowStart: windowStart ?? undefined,
    windowEnd: windowEnd ?? undefined,
    request_id: debugRequestId,
  });
  const debugResponse = await waitForWsResponse(socket, {
    requestId: debugRequestId,
    types: ['render_debug'],
    timeoutMs: timeoutMs + 2000,
  });
  if (!debugResponse) {
    throw new Error('Timed out waiting for UI render debug.');
  }
  const debug = debugResponse.payload ?? debugResponse;
  const debugCaptures = Array.isArray(debug.captures) ? debug.captures : [];
  const debugById = new Map(debugCaptures.map((entry) => [entry.id, entry]));

  const issues = [];
  const captureSummaries = [];

  for (const id of targetCaptureIds) {
    const debugCapture = debugById.get(id);
    const captureState = captures.find((entry) => entry.id === id);
    if (!debugCapture && !captureState) {
      issues.push({
        type: 'missing-capture',
        captureId: id,
        message: `Capture ${id} not found in UI state.`,
      });
      continue;
    }

    const tickCount =
      typeof captureState?.tickCount === 'number'
        ? captureState.tickCount
        : (typeof debugCapture?.tickCount === 'number' ? debugCapture.tickCount : 0);
    const recordCount =
      typeof debugCapture?.recordCount === 'number' ? debugCapture.recordCount : 0;

    const selectedForCapture = selectedMetrics.filter((metric) => metric.captureId === id);
    const selectedCount = selectedForCapture.length;

    const summary = {
      captureId: id,
      tickCount,
      recordCount,
      selectedMetricCount: selectedCount,
      duplicateTicks: 0,
      nullTickRanges: [],
      gapRanges: [],
      windowStart:
        typeof debug?.windowStart === 'number'
          ? debug.windowStart
          : (typeof windowStart === 'number' ? windowStart : stateWindowStart),
      windowEnd:
        typeof debug?.windowEnd === 'number'
          ? debug.windowEnd
          : (typeof windowEnd === 'number' ? windowEnd : stateWindowEnd),
    };

    if (debugCapture) {
      if (
        typeof debugCapture.recordCount === 'number'
        && typeof debugCapture.tickCount === 'number'
        && debugCapture.recordCount > debugCapture.tickCount
      ) {
        issues.push({
          type: 'record-count-exceeds-tick-count',
          captureId: id,
          recordCount: debugCapture.recordCount,
          tickCount: debugCapture.tickCount,
        });
      }

      if (debugCapture.recordCount === 0 && selectedCount > 0) {
        issues.push({
          type: 'no-records-for-selected-metrics',
          captureId: id,
        });
      }
    }

    if (selectedCount === 0) {
      captureSummaries.push(summary);
      continue;
    }

    const tableRequestId = `${idPrefix}-table-${id}`;
    sendWsMessage(socket, {
      type: 'get_render_table',
      captureId: String(id),
      windowSize: windowSize ?? undefined,
      windowStart: windowStart ?? undefined,
      windowEnd: windowEnd ?? undefined,
      request_id: tableRequestId,
    });
    let tableResponse;
    try {
      tableResponse = await waitForWsResponse(socket, {
        requestId: tableRequestId,
        types: ['render_table'],
        timeoutMs: timeoutMs + 2000,
      });
    } catch (error) {
      issues.push({
        type: 'render-table-error',
        captureId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      captureSummaries.push(summary);
      continue;
    }
    if (!tableResponse) {
      issues.push({
        type: 'render-table-timeout',
        captureId: id,
      });
      captureSummaries.push(summary);
      continue;
    }

    const table = tableResponse.payload ?? tableResponse;
    const rows = Array.isArray(table.rows) ? table.rows : [];
    const ticks = [];
    const nullTicks = [];
    const tickCounts = new Map();

    rows.forEach((row) => {
      const tick = row[0];
      if (typeof tick !== 'number') {
        return;
      }
      ticks.push(tick);
      tickCounts.set(tick, (tickCounts.get(tick) ?? 0) + 1);
      const values = row.slice(1);
      if (values.some((value) => typeof value !== 'number')) {
        nullTicks.push(tick);
      }
    });

    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);
    const duplicateTicks = Array.from(tickCounts.values()).reduce(
      (total, count) => total + Math.max(0, count - 1),
      0,
    );
    const nullRanges = compressConsecutiveRanges(nullTicks);
    const gapRanges = findMissingTickRanges(uniqueTicks);

    summary.duplicateTicks = duplicateTicks;
    summary.nullTickRanges = nullRanges;
    summary.gapRanges = gapRanges;
    summary.windowStart = typeof table.windowStart === 'number' ? table.windowStart : summary.windowStart;
    summary.windowEnd = typeof table.windowEnd === 'number' ? table.windowEnd : summary.windowEnd;

    if (duplicateTicks > 0) {
      issues.push({
        type: 'duplicate-ticks',
        captureId: id,
        count: duplicateTicks,
      });
    }
    if (nullRanges.length > 0) {
      issues.push({
        type: 'null-ticks',
        captureId: id,
        ranges: nullRanges,
      });
    }
    if (gapRanges.length > 0) {
      issues.push({
        type: 'missing-ticks',
        captureId: id,
        ranges: gapRanges,
      });
    }

    captureSummaries.push(summary);
  }

  const effectiveWindowStart =
    typeof debug?.windowStart === 'number'
      ? debug.windowStart
      : (typeof windowStart === 'number' ? windowStart : stateWindowStart);
  const effectiveWindowEnd =
    typeof debug?.windowEnd === 'number'
      ? debug.windowEnd
      : (typeof windowEnd === 'number' ? windowEnd : stateWindowEnd);
  const effectiveWindowSize =
    typeof debug?.windowSize === 'number'
      ? debug.windowSize
      : (typeof windowSize === 'number'
          ? windowSize
          : Math.max(1, effectiveWindowEnd - effectiveWindowStart + 1));

  return {
    report: {
      status: issues.length > 0 ? 'discrepancy' : 'ok',
      checkedAt: new Date().toISOString(),
      captureId: captureId ? String(captureId) : 'all',
      windowStart: effectiveWindowStart,
      windowEnd: effectiveWindowEnd,
      windowSize: effectiveWindowSize,
      issues,
      captures: captureSummaries,
    },
    selectedMetrics,
  };
}

async function collectUiDebugSnapshot(
  socket,
  {
    timeoutMs = 5000,
    requestIdBase = null,
  } = {},
) {
  const requestId = `${requestIdBase || buildMessageId(null, 'ui-verify')}-debug`;
  sendWsMessage(socket, { type: 'get_ui_debug', request_id: requestId });
  const response = await waitForWsResponse(socket, {
    requestId,
    types: ['ui_debug'],
    timeoutMs: timeoutMs + 2000,
  });
  if (!response) {
    throw new Error('Timed out waiting for UI debug.');
  }
  return response.payload ?? response;
}

async function collectUiMetricCoverageSnapshot(
  socket,
  {
    captureId = null,
    timeoutMs = 5000,
    requestIdBase = null,
  } = {},
) {
  const requestId = `${requestIdBase || buildMessageId(null, 'ui-verify')}-coverage`;
  sendWsMessage(socket, {
    type: 'get_metric_coverage',
    captureId: captureId ? String(captureId) : undefined,
    request_id: requestId,
  });
  const response = await waitForWsResponse(socket, {
    requestId,
    types: ['metric_coverage'],
    timeoutMs: timeoutMs + 2000,
  });
  if (!response) {
    throw new Error('Timed out waiting for UI metric coverage.');
  }
  return response.payload ?? response;
}

function toMetricPath(metric) {
  if (!metric || typeof metric !== 'object') {
    return null;
  }
  if (Array.isArray(metric.path) && metric.path.length > 0) {
    const path = metric.path
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry.length > 0);
    return path.length > 0 ? path : null;
  }
  if (typeof metric.fullPath === 'string' && metric.fullPath.trim().length > 0) {
    const path = metric.fullPath
      .split('.')
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry.length > 0);
    return path.length > 0 ? path : null;
  }
  return null;
}

function toServerLiveStatusMap(liveStatus, debugCaptures) {
  const map = new Map();
  const streams = Array.isArray(liveStatus?.streams) ? liveStatus.streams : [];
  streams.forEach((stream) => {
    if (!stream || typeof stream.captureId !== 'string') {
      return;
    }
    if (typeof stream.lastError === 'string' && stream.lastError.trim().length > 0) {
      map.set(stream.captureId, 'error');
      return;
    }
    map.set(stream.captureId, 'connected');
  });
  const captures = Array.isArray(debugCaptures?.captures) ? debugCaptures.captures : [];
  captures.forEach((capture) => {
    if (!capture || typeof capture.captureId !== 'string') {
      return;
    }
    if (!map.has(capture.captureId)) {
      map.set(capture.captureId, capture.ended ? 'completed' : 'idle');
    }
  });
  return map;
}

async function collectUiServerVerifySnapshot(
  uiHttpUrl,
  {
    captureId = null,
    requireSelected = true,
    preferCache = true,
  } = {},
) {
  const [debugState, debugCaptures, liveStatus] = await Promise.all([
    requestJson(buildUrl(uiHttpUrl, '/api/debug/state'), { method: 'GET' }),
    requestJson(buildUrl(uiHttpUrl, '/api/debug/captures'), { method: 'GET' }),
    requestJson(buildUrl(uiHttpUrl, '/api/live/status'), { method: 'GET' }),
  ]);

  const captures = Array.isArray(debugCaptures?.captures) ? debugCaptures.captures : [];
  const capturesById = new Map(
    captures
      .filter((entry) => entry && typeof entry.captureId === 'string')
      .map((entry) => [entry.captureId, entry]),
  );

  const rawSelectedMetrics = Array.isArray(debugState?.state?.selectedMetrics)
    ? debugState.state.selectedMetrics
    : [];
  const selectedMetrics = rawSelectedMetrics
    .filter((metric) => metric && typeof metric.captureId === 'string')
    .map((metric) => {
      const path = toMetricPath(metric);
      const fullPath = typeof metric.fullPath === 'string'
        ? metric.fullPath
        : (path ? path.join('.') : '');
      return {
        captureId: String(metric.captureId),
        path,
        fullPath,
        label: typeof metric.label === 'string' ? metric.label : fullPath,
      };
    })
    .filter((metric) => metric.path && metric.fullPath);

  const selectedCaptureIds = Array.from(
    new Set(selectedMetrics.map((metric) => metric.captureId)),
  );

  const targetCaptureIds = captureId
    ? [String(captureId)]
    : (selectedCaptureIds.length > 0
      ? selectedCaptureIds
      : captures
        .filter((entry) => typeof entry.captureId === 'string' && typeof entry.source === 'string' && entry.source)
        .map((entry) => entry.captureId));

  const selectedByCapture = new Map();
  selectedMetrics.forEach((metric) => {
    if (!targetCaptureIds.includes(metric.captureId)) {
      return;
    }
    const key = `${metric.captureId}::${metric.fullPath}`;
    const existing = selectedByCapture.get(metric.captureId) ?? new Map();
    if (!existing.has(key)) {
      existing.set(key, metric);
    }
    selectedByCapture.set(metric.captureId, existing);
  });

  const seriesByCapture = new Map();
  const seriesErrors = [];

  for (const id of targetCaptureIds) {
    const metricMap = selectedByCapture.get(id) ?? new Map();
    const metricList = Array.from(metricMap.values());
    if (metricList.length === 0) {
      seriesByCapture.set(id, []);
      continue;
    }
    const paths = metricList.map((metric) => metric.path).filter(Array.isArray);
    try {
      const seriesResponse = await requestJson(buildUrl(uiHttpUrl, '/api/series/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureId: id,
          paths,
          preferCache: preferCache !== false,
        }),
      });
      const series = Array.isArray(seriesResponse?.series) ? seriesResponse.series : [];
      seriesByCapture.set(id, series);
    } catch (error) {
      seriesByCapture.set(id, []);
      seriesErrors.push({
        captureId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const liveStatusByCapture = toServerLiveStatusMap(liveStatus, debugCaptures);
  return {
    sampledAt: new Date().toISOString(),
    captureId: captureId ? String(captureId) : 'all',
    frontendConnected: Boolean(debugState?.frontendConnected),
    stateSource: typeof debugState?.stateSource === 'string' ? debugState.stateSource : 'unknown',
    captures,
    capturesById,
    liveStatusByCapture,
    targetCaptureIds,
    selectedMetrics,
    selectedByCapture,
    seriesByCapture,
    seriesErrors,
    requireSelected,
  };
}

function evaluateUiServerVerifySnapshots({
  snapshots,
  captureId = null,
  requireSelected = true,
}) {
  const failures = [];
  const transientIssues = [];
  const captureTraces = new Map();
  const metricTraces = new Map();

  snapshots.forEach((snapshot) => {
    const targetIds = Array.isArray(snapshot.targetCaptureIds) ? snapshot.targetCaptureIds : [];
    if (snapshot.stateSource === 'empty') {
      failures.push({
        type: 'missing-dashboard-state',
        message: 'No persisted or live dashboard state available for verification.',
      });
    }
    if (Array.isArray(snapshot.seriesErrors) && snapshot.seriesErrors.length > 0) {
      snapshot.seriesErrors.forEach((entry) => {
        failures.push({
          type: 'series-query-error',
          captureId: entry.captureId ?? null,
          error: entry.error ?? 'series query failed',
        });
      });
    }

    targetIds.forEach((id) => {
      const capture = snapshot.capturesById.get(id);
      const selectedMetricMap = snapshot.selectedByCapture.get(id) ?? new Map();
      const selectedMetricCount = selectedMetricMap.size;
      const selectedMetricList = Array.from(selectedMetricMap.values());
      const seriesList = Array.isArray(snapshot.seriesByCapture.get(id))
        ? snapshot.seriesByCapture.get(id)
        : [];
      const seriesByFullPath = new Map(
        seriesList
          .filter((series) => series && typeof series.fullPath === 'string')
          .map((series) => [String(series.fullPath), series]),
      );

      if (!capture) {
        failures.push({
          type: 'missing-capture',
          captureId: id,
          message: `Capture ${id} not present in server debug captures.`,
        });
        return;
      }

      if (!capture.source || typeof capture.source !== 'string') {
        failures.push({
          type: 'missing-capture-source',
          captureId: id,
          message: `Capture ${id} has no source recorded on server.`,
        });
      }

      if (requireSelected && selectedMetricCount <= 0) {
        failures.push({
          type: 'no-selected-metrics',
          captureId: id,
          message: `Capture ${id} has no selected metrics.`,
        });
      }

      let recordCount = 0;
      let hasPartialSeries = false;
      seriesList.forEach((series) => {
        const numericCount = Number(series?.numericCount) || 0;
        if (numericCount > recordCount) {
          recordCount = numericCount;
        }
        if (series?.partial) {
          hasPartialSeries = true;
        }
      });

      const tickCount = Number(capture.lastTick) || 0;
      const liveStatus = snapshot.liveStatusByCapture.get(id) ?? 'idle';
      const loading = liveStatus === 'connected' || liveStatus === 'connecting' || Boolean(hasPartialSeries);

      const captureSample = {
        checkedAt: snapshot.sampledAt,
        tickCount,
        recordCount,
        selectedMetricCount,
        loading,
        liveStatus,
      };

      if (!captureTraces.has(id)) {
        captureTraces.set(id, []);
      }
      captureTraces.get(id).push(captureSample);

      selectedMetricList.forEach((metric) => {
        const fullPath = metric.fullPath;
        const series = seriesByFullPath.get(fullPath);
        const key = `${id}::${fullPath}`;
        const sample = {
          checkedAt: snapshot.sampledAt,
          numericCount: Number(series?.numericCount) || 0,
          total: Number(series?.tickCount) || 0,
          lastTick: Number(series?.lastTick) || 0,
          loading,
          liveStatus,
        };
        const existing = metricTraces.get(key);
        if (existing) {
          existing.samples.push(sample);
        } else {
          metricTraces.set(key, {
            key,
            captureId: id,
            fullPath,
            label: metric.label || fullPath,
            samples: [sample],
          });
        }
      });
    });
  });

  if (captureTraces.size === 0) {
    failures.push({
      type: 'no-captures',
      message: captureId
        ? `Capture ${captureId} not found in server verification snapshots.`
        : 'No captures found in server verification snapshots.',
    });
  }

  const captureSummaries = [];
  captureTraces.forEach((trace, id) => {
    const first = trace[0];
    const last = trace[trace.length - 1];
    if (!first || !last) {
      return;
    }

    for (let index = 1; index < trace.length; index += 1) {
      const prev = trace[index - 1];
      const next = trace[index];
      if (next.tickCount < prev.tickCount) {
        failures.push({
          type: 'tick-count-decreased',
          captureId: id,
          from: prev.tickCount,
          to: next.tickCount,
          at: next.checkedAt ?? null,
        });
      }
      if (next.recordCount < prev.recordCount) {
        failures.push({
          type: 'record-count-decreased',
          captureId: id,
          from: prev.recordCount,
          to: next.recordCount,
          at: next.checkedAt ?? null,
        });
      }
    }

    const tickDelta = last.tickCount - first.tickCount;
    const recordDelta = last.recordCount - first.recordCount;
    if (last.selectedMetricCount > 0 && tickDelta > 0 && recordDelta <= 0 && !last.loading) {
      failures.push({
        type: 'no-record-growth-while-ticks-grew',
        captureId: id,
        tickDelta,
        recordDelta,
      });
    }
    if (
      last.selectedMetricCount > 0
      && (last.liveStatus === 'completed' || last.liveStatus === 'idle')
      && last.tickCount > 0
      && last.recordCount === 0
    ) {
      failures.push({
        type: 'completed-without-records',
        captureId: id,
        tickCount: last.tickCount,
      });
    }

    captureSummaries.push({
      captureId: id,
      firstTickCount: first.tickCount,
      lastTickCount: last.tickCount,
      firstRecordCount: first.recordCount,
      lastRecordCount: last.recordCount,
      tickDelta,
      recordDelta,
      selectedMetricCount: last.selectedMetricCount,
      liveStatus: last.liveStatus,
      loadingAtEnd: last.loading,
      sampleCount: trace.length,
    });
  });

  const metricSummaries = [];
  metricTraces.forEach((trace, key) => {
    const samples = Array.isArray(trace.samples) ? trace.samples : [];
    if (samples.length === 0) {
      return;
    }
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last) {
      return;
    }
    let increments = 0;
    for (let index = 1; index < samples.length; index += 1) {
      const prev = samples[index - 1];
      const next = samples[index];
      if (next.numericCount < prev.numericCount) {
        failures.push({
          type: 'metric-numeric-count-decreased',
          captureId: trace.captureId,
          fullPath: trace.fullPath,
          from: prev.numericCount,
          to: next.numericCount,
          at: next.checkedAt ?? null,
        });
      }
      if (next.numericCount > prev.numericCount) {
        increments += 1;
      }
    }
    if (last.liveStatus === 'completed' && last.total > 0 && last.numericCount === 0) {
      failures.push({
        type: 'completed-metric-without-values',
        captureId: trace.captureId,
        fullPath: trace.fullPath,
        total: last.total,
      });
    }
    if (last.loading && first.numericCount === 0 && last.numericCount === 0 && last.total === 0) {
      transientIssues.push({
        type: 'metric-still-loading',
        captureId: trace.captureId,
        fullPath: trace.fullPath,
      });
    }
    metricSummaries.push({
      key,
      captureId: trace.captureId,
      fullPath: trace.fullPath,
      label: trace.label,
      firstNumericCount: first.numericCount,
      lastNumericCount: last.numericCount,
      total: last.total,
      delta: last.numericCount - first.numericCount,
      increments,
      liveStatus: last.liveStatus,
      loadingAtEnd: last.loading,
      sampleCount: samples.length,
    });
  });

  const normalizedFailures = dedupeIssueList(failures);
  const normalizedTransientIssues = dedupeIssueList(transientIssues);
  return {
    status: normalizedFailures.length > 0 ? 'failed' : (normalizedTransientIssues.length > 0 ? 'warning' : 'ok'),
    checkedAt: new Date().toISOString(),
    captureId: captureId ? String(captureId) : 'all',
    captures: captureSummaries,
    metrics: metricSummaries,
    failures: normalizedFailures,
    transientIssues: normalizedTransientIssues,
  };
}

async function collectUiServerVerifyReport(
  uiHttpUrl,
  {
    captureId = null,
    observeMs = 5000,
    intervalMs = 1000,
    requireSelected = true,
  } = {},
) {
  const start = Date.now();
  const snapshots = [];
  let index = 0;
  while (true) {
    snapshots.push(
      await collectUiServerVerifySnapshot(uiHttpUrl, {
        captureId,
        requireSelected,
        preferCache: true,
      }),
    );
    index += 1;
    const elapsed = Date.now() - start;
    if (elapsed >= observeMs) {
      break;
    }
    await delay(Math.min(intervalMs, Math.max(1, observeMs - elapsed)));
  }

  const report = evaluateUiServerVerifySnapshots({
    snapshots,
    captureId,
    requireSelected,
  });

  report.observeMs = observeMs;
  report.intervalMs = intervalMs;
  report.mode = 'server';
  report.samples = snapshots.map((snapshot) => {
    const sampleCaptures = snapshot.targetCaptureIds.map((id) => {
      const capture = snapshot.capturesById.get(id);
      const selectedMetricMap = snapshot.selectedByCapture.get(id) ?? new Map();
      const seriesList = Array.isArray(snapshot.seriesByCapture.get(id))
        ? snapshot.seriesByCapture.get(id)
        : [];
      let recordCount = 0;
      seriesList.forEach((series) => {
        const numericCount = Number(series?.numericCount) || 0;
        if (numericCount > recordCount) {
          recordCount = numericCount;
        }
      });
      return {
        captureId: id,
        tickCount: Number(capture?.lastTick) || 0,
        recordCount,
        selectedMetricCount: selectedMetricMap.size,
      };
    });
    return {
      sampledAt: snapshot.sampledAt,
      checkStatus: 'server',
      issueCount: 0,
      loadingProbe: {
        pendingSeries: 0,
        pendingAppends: 0,
        pendingComponentUpdates: 0,
        pendingTicks: 0,
      },
      captures: sampleCaptures,
      metricCoverageCount: sampleCaptures.reduce(
        (total, entry) => total + Number(entry.selectedMetricCount || 0),
        0,
      ),
      frontendConnected: snapshot.frontendConnected,
      stateSource: snapshot.stateSource,
    };
  });

  return { report };
}

async function createGeneratedRegressionCaptureFile({
  frames = 24000,
  prefix = 'ui-regression',
} = {}) {
  const safePrefix = String(prefix || 'ui-regression').replace(/[^a-zA-Z0-9._-]/g, '-');
  const filePath = path.join(
    os.tmpdir(),
    `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jsonl`,
  );
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const lines = [];
  for (let tick = 1; tick <= frames; tick += 1) {
    const value = Math.round(60 + (18 * Math.sin(tick / 9)) + (tick * 0.42));
    const frame = {
      tick,
      entities: {
        0: {
          regression_signal: {
            value,
            control: tick % 11,
          },
        },
      },
    };
    lines.push(JSON.stringify(frame));
  }
  await fs.promises.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  return { filePath, frames };
}

function getRegressionLiveStatus(liveStatus, captureId, captureEntry) {
  const streams = Array.isArray(liveStatus?.streams) ? liveStatus.streams : [];
  const stream = streams.find((entry) => entry && entry.captureId === captureId);
  if (stream) {
    if (typeof stream.lastError === 'string' && stream.lastError.trim().length > 0) {
      return 'error';
    }
    return 'connected';
  }
  if (captureEntry?.ended) {
    return 'completed';
  }
  return 'idle';
}

async function isMetricSelectedOnServer(uiHttpUrl, captureId, fullPath) {
  const state = await requestJson(buildUrl(uiHttpUrl, '/api/debug/state'), { method: 'GET' });
  const selectedMetrics = Array.isArray(state?.state?.selectedMetrics)
    ? state.state.selectedMetrics
    : [];
  return selectedMetrics.some((metric) => (
    metric
    && metric.captureId === captureId
    && (metric.fullPath === fullPath
      || (
        Array.isArray(metric.path)
        && metric.path.map((part) => String(part)).join('.') === fullPath
      ))
  ));
}

async function startUiRegressionLiveCapture(uiHttpUrl, {
  captureId,
  source,
  filename,
  pollIntervalMs,
}) {
  await requestJson(buildUrl(uiHttpUrl, '/api/live/stop'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ captureId }),
  });
  const response = await requestJson(buildUrl(uiHttpUrl, '/api/live/start'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      captureId,
      source,
      filename,
      pollIntervalMs,
    }),
  });
  return response;
}

function summarizeUiRegressionFlowSamples(samples, expectedFrames) {
  const list = Array.isArray(samples) ? samples : [];
  const first = list[0] ?? null;
  const last = list[list.length - 1] ?? null;
  if (!first || !last) {
    return {
      sampleCount: list.length,
      firstTick: 0,
      lastTick: 0,
      firstNumericCount: 0,
      lastNumericCount: 0,
      tickDelta: 0,
      numericDelta: 0,
      increments: 0,
      progressionType: 'none',
      monotonicTick: true,
      monotonicNumeric: true,
      completed: false,
      hasValues: false,
      finalLiveStatus: 'idle',
    };
  }

  let monotonicTick = true;
  let monotonicNumeric = true;
  let increments = 0;
  for (let index = 1; index < list.length; index += 1) {
    const prev = list[index - 1];
    const next = list[index];
    if ((next.captureLastTick ?? 0) < (prev.captureLastTick ?? 0)) {
      monotonicTick = false;
    }
    if ((next.numericCount ?? 0) < (prev.numericCount ?? 0)) {
      monotonicNumeric = false;
    }
    if ((next.numericCount ?? 0) > (prev.numericCount ?? 0)) {
      increments += 1;
    }
  }

  const firstNumericCount = Number(first.numericCount) || 0;
  const lastNumericCount = Number(last.numericCount) || 0;
  const firstTick = Number(first.captureLastTick) || 0;
  const lastTick = Number(last.captureLastTick) || 0;
  let progressionType = 'none';
  if (lastNumericCount > 0) {
    const bigJump = increments <= 1 && (lastNumericCount - firstNumericCount) >= 20;
    if (bigJump) {
      progressionType = 'jump';
    } else if (increments >= 2) {
      progressionType = 'progressive';
    } else {
      progressionType = 'sparse';
    }
  }
  return {
    sampleCount: list.length,
    firstTick,
    lastTick,
    firstNumericCount,
    lastNumericCount,
    tickDelta: lastTick - firstTick,
    numericDelta: lastNumericCount - firstNumericCount,
    increments,
    progressionType,
    monotonicTick,
    monotonicNumeric,
    completed: lastTick >= expectedFrames && lastNumericCount >= expectedFrames,
    hasValues: lastNumericCount > 0,
    finalLiveStatus: typeof last.liveStatus === 'string' ? last.liveStatus : 'idle',
  };
}

async function observeUiRegressionFlow(uiHttpUrl, {
  flowName,
  captureId,
  metricPath,
  fullPath,
  observeMs,
  intervalMs,
  expectedFrames,
}) {
  const samples = [];
  const start = Date.now();
  while (true) {
    const [seriesResponse, debugCaptures, liveStatus] = await Promise.all([
      requestJson(buildUrl(uiHttpUrl, '/api/series/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          captureId,
          paths: [metricPath],
          preferCache: true,
        }),
      }),
      requestJson(buildUrl(uiHttpUrl, '/api/debug/captures'), { method: 'GET' }),
      requestJson(buildUrl(uiHttpUrl, '/api/live/status'), { method: 'GET' }),
    ]);

    const series = Array.isArray(seriesResponse?.series) ? seriesResponse.series[0] : null;
    const captures = Array.isArray(debugCaptures?.captures) ? debugCaptures.captures : [];
    const captureEntry = captures.find((entry) => entry && entry.captureId === captureId) ?? null;
    const sample = {
      sampledAt: new Date().toISOString(),
      captureId,
      fullPath,
      captureLastTick: Number(captureEntry?.lastTick) || 0,
      numericCount: Number(series?.numericCount) || 0,
      tickCount: Number(series?.tickCount) || 0,
      seriesLastTick: Number(series?.lastTick) || 0,
      partial: Boolean(series?.partial),
      liveStatus: getRegressionLiveStatus(liveStatus, captureId, captureEntry),
    };
    samples.push(sample);

    const elapsed = Date.now() - start;
    const isComplete = sample.captureLastTick >= expectedFrames && sample.numericCount >= expectedFrames;
    if (elapsed >= observeMs || isComplete) {
      break;
    }
    await delay(intervalMs);
  }

  return {
    name: flowName,
    captureId,
    fullPath,
    samples,
    summary: summarizeUiRegressionFlowSamples(samples, expectedFrames),
  };
}

async function fetchUiSeriesEntry(uiHttpUrl, {
  captureId,
  metricPath,
  preferCache = true,
}) {
  const response = await requestJson(buildUrl(uiHttpUrl, '/api/series/batch'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      captureId,
      paths: [metricPath],
      preferCache,
    }),
  });
  const entry = Array.isArray(response?.series) ? response.series[0] : null;
  const points = Array.isArray(entry?.points) ? entry.points : [];
  return {
    captureId,
    path: [...metricPath],
    fullPath: metricPath.join('.'),
    numericCount: Number(entry?.numericCount) || 0,
    tickCount: Number(entry?.tickCount) || 0,
    lastTick: Number(entry?.lastTick) || 0,
    partial: Boolean(entry?.partial),
    points,
  };
}

async function fetchUiSeriesBatch(uiHttpUrl, {
  captureId,
  metricPaths,
  preferCache = true,
}) {
  const response = await requestJson(buildUrl(uiHttpUrl, '/api/series/batch'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      captureId,
      paths: metricPaths,
      preferCache,
    }),
  });
  const entries = Array.isArray(response?.series) ? response.series : [];
  const byPath = new Map();
  entries.forEach((entry) => {
    const path = Array.isArray(entry?.path)
      ? entry.path.map((part) => String(part))
      : [];
    if (path.length === 0) {
      return;
    }
    byPath.set(path.join('.'), {
      captureId,
      path,
      fullPath: path.join('.'),
      numericCount: Number(entry?.numericCount) || 0,
      tickCount: Number(entry?.tickCount) || 0,
      lastTick: Number(entry?.lastTick) || 0,
      partial: Boolean(entry?.partial),
      points: Array.isArray(entry?.points) ? entry.points : [],
    });
  });
  return byPath;
}

function buildNumericPointMap(seriesEntry) {
  const map = new Map();
  const points = Array.isArray(seriesEntry?.points) ? seriesEntry.points : [];
  points.forEach((point) => {
    const tick = Number(point?.tick);
    const value = point?.value;
    if (!Number.isFinite(tick) || typeof value !== 'number' || Number.isNaN(value)) {
      return;
    }
    map.set(tick, value);
  });
  return map;
}

function evaluateDerivedDiffSeries({
  valueSeries,
  controlSeries,
  diffSeries,
  tolerance = 1e-9,
  sampleLimit = 64,
}) {
  const failures = [];
  const warnings = [];
  const valueMap = buildNumericPointMap(valueSeries);
  const controlMap = buildNumericPointMap(controlSeries);
  const diffMap = buildNumericPointMap(diffSeries);
  const commonTicks = Array.from(diffMap.keys())
    .filter((tick) => valueMap.has(tick) && controlMap.has(tick))
    .sort((a, b) => a - b);

  if (commonTicks.length === 0) {
    failures.push({
      type: 'derivation-diff-no-common-ticks',
      message: 'No shared numeric ticks between source and derived diff series.',
    });
    return {
      status: 'failed',
      failures: dedupeIssueList(failures),
      warnings: dedupeIssueList(warnings),
      comparedTicks: 0,
      mismatches: 0,
      sampleTicks: [],
    };
  }

  const sampleTicks = [];
  if (commonTicks.length <= sampleLimit) {
    sampleTicks.push(...commonTicks);
  } else {
    const step = Math.max(1, Math.floor(commonTicks.length / sampleLimit));
    for (let index = 0; index < commonTicks.length; index += step) {
      sampleTicks.push(commonTicks[index]);
      if (sampleTicks.length >= sampleLimit) {
        break;
      }
    }
    const last = commonTicks[commonTicks.length - 1];
    if (!sampleTicks.includes(last)) {
      sampleTicks.push(last);
    }
  }

  let mismatchCount = 0;
  sampleTicks.forEach((tick) => {
    const value = Number(valueMap.get(tick));
    const control = Number(controlMap.get(tick));
    const actual = Number(diffMap.get(tick));
    const expected = value - control;
    const delta = Math.abs(actual - expected);
    if (!Number.isFinite(expected) || !Number.isFinite(actual) || delta > tolerance) {
      mismatchCount += 1;
      if (mismatchCount <= 10) {
        failures.push({
          type: 'derivation-diff-mismatch',
          tick,
          expected,
          actual,
          delta,
          tolerance,
        });
      }
    }
  });

  if (mismatchCount > 10) {
    warnings.push({
      type: 'derivation-diff-mismatch-truncated',
      mismatchCount,
      message: 'Only first 10 mismatches are reported.',
    });
  }

  return {
    status: mismatchCount > 0 ? 'failed' : 'ok',
    failures: dedupeIssueList(failures),
    warnings: dedupeIssueList(warnings),
    comparedTicks: sampleTicks.length,
    mismatches: mismatchCount,
    sampleTicks,
  };
}

async function runUiDerivationRegressionChecks({
  uiHttpUrl,
  socket,
  sendCommand,
  baseCaptureId,
  idBase,
  frames,
  observeMs,
  intervalMs,
}) {
  const failures = [];
  const warnings = [];
  const baseValuePath = ['0', 'regression_signal', 'value'];
  const baseControlPath = ['0', 'regression_signal', 'control'];
  const outputMetricPath = ['0', 'derivations', 'diff'];
  const groupId = `${idBase}-derive-group`;
  const outputCaptureId = `${idBase}-derive-diff`;
  let completion = null;
  let derivedFlow = null;
  let correctness = null;
  let groupState = null;

  try {
    await sendCommand('remove_capture', { captureId: outputCaptureId });
  } catch {
    // ignore: may not exist
  }

  try {
    await sendCommand('create_derivation_group', {
      groupId,
      name: groupId,
    });
    await sendCommand('set_active_derivation_group', { groupId });
    await sendCommand('select_analysis_metric', {
      captureId: baseCaptureId,
      path: baseValuePath,
    });
    await sendCommand('select_analysis_metric', {
      captureId: baseCaptureId,
      path: baseControlPath,
    });

    try {
      const state = await requestJson(buildUrl(uiHttpUrl, '/api/debug/state'), { method: 'GET' });
      const groups = Array.isArray(state?.state?.derivationGroups)
        ? state.state.derivationGroups
        : [];
      groupState = groups.find((entry) => entry && entry.id === groupId) ?? null;
      const metricCount = Array.isArray(groupState?.metrics) ? groupState.metrics.length : 0;
      if (metricCount < 2) {
        failures.push({
          type: 'derivation-group-metric-count',
          groupId,
          metricCount,
          expectedAtLeast: 2,
          message: 'Derivation group did not retain expected input metrics.',
        });
      }
    } catch (error) {
      warnings.push({
        type: 'derivation-group-state-unavailable',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const runRequestId = await sendCommand('run_derivation', {
      kind: 'diff',
      groupId,
      leftIndex: 0,
      rightIndex: 1,
      outputCaptureId,
    });
    completion = await waitForDerivationCompletionOrThrow(socket, {
      requestId: runRequestId,
      timeoutMs: Math.max(30000, observeMs + 8000),
      actionLabel: 'verify-regression derivation',
    });

    derivedFlow = await observeUiRegressionFlow(uiHttpUrl, {
      flowName: 'derivation-diff',
      captureId: outputCaptureId,
      metricPath: outputMetricPath,
      fullPath: outputMetricPath.join('.'),
      observeMs,
      intervalMs,
      expectedFrames: frames,
    });

    const baseSeries = await fetchUiSeriesBatch(uiHttpUrl, {
      captureId: baseCaptureId,
      metricPaths: [baseValuePath, baseControlPath],
      preferCache: true,
    });
    const valueSeries = baseSeries.get(baseValuePath.join('.'));
    const controlSeries = baseSeries.get(baseControlPath.join('.'));
    const diffSeries = await fetchUiSeriesEntry(uiHttpUrl, {
      captureId: outputCaptureId,
      metricPath: outputMetricPath,
      preferCache: true,
    });

    if (!valueSeries || !controlSeries) {
      failures.push({
        type: 'derivation-base-series-missing',
        message: 'Missing base series while validating derivation diff output.',
      });
    } else {
      correctness = evaluateDerivedDiffSeries({
        valueSeries,
        controlSeries,
        diffSeries,
      });
      failures.push(...correctness.failures);
      warnings.push(...correctness.warnings);
    }

    const summary = derivedFlow?.summary ?? null;
    if (!summary || !summary.hasValues) {
      failures.push({
        type: 'derivation-output-no-values',
        outputCaptureId,
      });
    } else {
      if (!summary.monotonicTick || !summary.monotonicNumeric) {
        failures.push({
          type: 'derivation-output-non-monotonic',
          outputCaptureId,
          monotonicTick: summary.monotonicTick,
          monotonicNumeric: summary.monotonicNumeric,
        });
      }
      if (summary.lastNumericCount <= 0) {
        failures.push({
          type: 'derivation-output-empty-series',
          outputCaptureId,
          lastNumericCount: summary.lastNumericCount,
        });
      }
      if (!summary.completed) {
        warnings.push({
          type: 'derivation-output-incomplete',
          outputCaptureId,
          expectedFrames: frames,
          lastNumericCount: summary.lastNumericCount,
          lastTick: summary.lastTick,
        });
      }
    }
  } catch (error) {
    failures.push({
      type: 'derivation-regression-error',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      await sendCommand('remove_capture', { captureId: outputCaptureId });
    } catch {
      // ignore cleanup errors
    }
    try {
      await sendCommand('delete_derivation_group', { groupId });
    } catch {
      // ignore cleanup errors
    }
  }

  const normalizedFailures = dedupeIssueList(failures);
  const normalizedWarnings = dedupeIssueList(warnings);
  return {
    status: normalizedFailures.length > 0 ? 'failed' : (normalizedWarnings.length > 0 ? 'warning' : 'ok'),
    groupId,
    outputCaptureId,
    completionType: completion?.type ?? null,
    completionPayload: completion?.payload ?? null,
    groupState,
    flow: derivedFlow,
    correctness,
    failures: normalizedFailures,
    warnings: normalizedWarnings,
  };
}

function evaluateUiRegressionFlows({
  firstFlow,
  secondFlow,
  expectedFrames,
  requireSelected = true,
}) {
  const failures = [];
  const warnings = [];
  const a = firstFlow?.summary ?? null;
  const b = secondFlow?.summary ?? null;
  if (!a || !b) {
    failures.push({
      type: 'missing-flow-summary',
      message: 'Missing flow summary for regression verification.',
    });
  } else {
    if (!a.monotonicTick || !a.monotonicNumeric) {
      failures.push({
        type: 'flow-non-monotonic',
        flow: firstFlow.name,
        monotonicTick: a.monotonicTick,
        monotonicNumeric: a.monotonicNumeric,
      });
    }
    if (!b.monotonicTick || !b.monotonicNumeric) {
      failures.push({
        type: 'flow-non-monotonic',
        flow: secondFlow.name,
        monotonicTick: b.monotonicTick,
        monotonicNumeric: b.monotonicNumeric,
      });
    }
    if (!a.hasValues || !b.hasValues) {
      failures.push({
        type: 'missing-values',
        firstFlowHasValues: a.hasValues,
        secondFlowHasValues: b.hasValues,
      });
    }
    if (requireSelected && (!firstFlow.selectedMetricAtStart || !secondFlow.selectedMetricAtStart)) {
      failures.push({
        type: 'metric-not-selected',
        firstFlowSelected: Boolean(firstFlow.selectedMetricAtStart),
        secondFlowSelected: Boolean(secondFlow.selectedMetricAtStart),
      });
    }
    if (a.progressionType === 'jump' && b.progressionType === 'jump') {
      warnings.push({
        type: 'both-flows-jump',
        message: 'Both flows populated in a jump pattern; this may still look abrupt in UI.',
      });
    }
    if (a.completed && b.completed && a.lastNumericCount !== b.lastNumericCount) {
      failures.push({
        type: 'final-count-mismatch',
        first: a.lastNumericCount,
        second: b.lastNumericCount,
      });
    }
    if (!a.completed || !b.completed) {
      warnings.push({
        type: 'incomplete-observation',
        expectedFrames,
        firstCompleted: a.completed,
        secondCompleted: b.completed,
      });
    }
  }

  const normalizedFailures = dedupeIssueList(failures);
  const normalizedWarnings = dedupeIssueList(warnings);
  return {
    status: normalizedFailures.length > 0 ? 'failed' : (normalizedWarnings.length > 0 ? 'warning' : 'ok'),
    failures: normalizedFailures,
    warnings: normalizedWarnings,
  };
}

async function runUiRegressionVerify({
  uiHttpUrl,
  uiWsUrl,
  observeMs,
  intervalMs,
  pollMs,
  frames,
  requireSelected,
  captureId = null,
}) {
  const idBase = captureId || `verify-regression-${Date.now().toString(36)}`;
  const regressionCaptureId = captureId || `${idBase}-capture`;
  const metricPath = ['0', 'regression_signal', 'value'];
  const fullPath = metricPath.join('.');
  const generated = await createGeneratedRegressionCaptureFile({
    frames,
    prefix: idBase,
  });

  const socket = await connectWebSocket(uiWsUrl);
  const registeredRequest = { type: 'register', role: 'agent' };
  sendWsMessage(socket, registeredRequest);
  const registered = await waitForWsAck(socket);
  if (!registered) {
    socket.close();
    throw new Error('Failed to register with UI websocket for verify-regression.');
  }

  let commandCount = 0;
  const sendCommand = async (type, payload = {}) => {
    commandCount += 1;
    const requestId = buildMessageId(
      null,
      `ui-verify-regression-${String(type)}-${String(commandCount)}`,
    );
    sendWsMessage(socket, {
      type,
      ...payload,
      request_id: requestId,
    });
    await waitForUiAckOrThrow(socket, {
      requestId,
      timeoutMs: 7000,
      errorMessage: `Timed out waiting for UI ack (${String(type)}).`,
    });
  };

  const cleanup = async () => {
    try {
      await requestJson(buildUrl(uiHttpUrl, '/api/live/stop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captureId: regressionCaptureId }),
      });
    } catch {
      // ignore cleanup errors
    }
    try {
      await sendCommand('remove_capture', { captureId: regressionCaptureId });
    } catch {
      // ignore cleanup errors
    }
    try {
      await sendCommand('clear_selection');
    } catch {
      // ignore cleanup errors
    }
    try {
      socket.close();
    } catch {
      // ignore cleanup errors
    }
    try {
      await fs.promises.unlink(generated.filePath);
    } catch {
      // ignore cleanup errors
    }
  };

  try {
    await sendCommand('clear_selection');
    await sendCommand('remove_capture', { captureId: regressionCaptureId });

    await sendCommand('select_metric', {
      captureId: regressionCaptureId,
      path: metricPath,
    });
    const firstSelected = await isMetricSelectedOnServer(uiHttpUrl, regressionCaptureId, fullPath);
    await startUiRegressionLiveCapture(uiHttpUrl, {
      captureId: regressionCaptureId,
      source: generated.filePath,
      filename: path.basename(generated.filePath),
      pollIntervalMs: pollMs,
    });
    const firstFlow = await observeUiRegressionFlow(uiHttpUrl, {
      flowName: 'select-on-new-stream',
      captureId: regressionCaptureId,
      metricPath,
      fullPath,
      observeMs,
      intervalMs,
      expectedFrames: frames,
    });
    firstFlow.selectedMetricAtStart = firstSelected;

    await sendCommand('remove_capture', { captureId: regressionCaptureId });
    let secondSelected = await isMetricSelectedOnServer(uiHttpUrl, regressionCaptureId, fullPath);
    if (!secondSelected) {
      await sendCommand('select_metric', {
        captureId: regressionCaptureId,
        path: metricPath,
      });
      secondSelected = await isMetricSelectedOnServer(uiHttpUrl, regressionCaptureId, fullPath);
    }
    await startUiRegressionLiveCapture(uiHttpUrl, {
      captureId: regressionCaptureId,
      source: generated.filePath,
      filename: path.basename(generated.filePath),
      pollIntervalMs: pollMs,
    });
    const secondFlow = await observeUiRegressionFlow(uiHttpUrl, {
      flowName: 'refresh-with-selected-metric',
      captureId: regressionCaptureId,
      metricPath,
      fullPath,
      observeMs,
      intervalMs,
      expectedFrames: frames,
    });
    secondFlow.selectedMetricAtStart = secondSelected;

    const evaluation = evaluateUiRegressionFlows({
      firstFlow,
      secondFlow,
      expectedFrames: frames,
      requireSelected,
    });
    const derivation = await runUiDerivationRegressionChecks({
      uiHttpUrl,
      socket,
      sendCommand,
      baseCaptureId: regressionCaptureId,
      idBase,
      frames,
      observeMs,
      intervalMs,
    });
    const failures = dedupeIssueList([
      ...evaluation.failures,
      ...(Array.isArray(derivation?.failures) ? derivation.failures : []),
    ]);
    const warnings = dedupeIssueList([
      ...evaluation.warnings,
      ...(Array.isArray(derivation?.warnings) ? derivation.warnings : []),
    ]);
    const status = failures.length > 0 ? 'failed' : (warnings.length > 0 ? 'warning' : 'ok');

    return {
      report: {
        status,
        checkedAt: new Date().toISOString(),
        mode: 'server-regression',
        frontendRequired: false,
        captureId: regressionCaptureId,
        metric: {
          path: metricPath,
          fullPath,
        },
        generated: {
          filePath: generated.filePath,
          frames,
        },
        flows: [
          firstFlow,
          secondFlow,
        ],
        derivation,
        failures,
        warnings,
      },
    };
  } finally {
    await cleanup();
  }
}

function normalizeLoadingProbe(debug) {
  const probe = debug?.state?.loadingProbe ?? {};
  return {
    pendingSeries: Number(probe.pendingSeries) || 0,
    pendingAppends: Number(probe.pendingAppends) || 0,
    pendingComponentUpdates: Number(probe.pendingComponentUpdates) || 0,
    pendingTicks: Number(probe.pendingTicks) || 0,
  };
}

function isLoadingActive(probe) {
  return (
    (Number(probe?.pendingSeries) || 0) > 0
    || (Number(probe?.pendingAppends) || 0) > 0
    || (Number(probe?.pendingComponentUpdates) || 0) > 0
    || (Number(probe?.pendingTicks) || 0) > 0
  );
}

function toLiveStatusMap(debug) {
  const streams = Array.isArray(debug?.state?.liveStreams) ? debug.state.liveStreams : [];
  return new Map(
    streams
      .filter((entry) => entry && typeof entry.id === 'string')
      .map((entry) => [entry.id, String(entry.status || 'idle')]),
  );
}

function isLiveStatusLoading(status) {
  const normalized = String(status || 'idle');
  return (
    normalized === 'connecting'
    || normalized === 'retrying'
    || normalized === 'loading'
    || normalized === 'connected'
  );
}

function isLiveStatusStable(status) {
  const normalized = String(status || 'idle');
  return normalized === 'completed' || normalized === 'idle' || normalized === 'error';
}

function dedupeIssueList(issues) {
  const seen = new Set();
  const deduped = [];
  const list = Array.isArray(issues) ? issues : [];
  list.forEach((issue) => {
    if (!issue || typeof issue !== 'object') {
      return;
    }
    const key = JSON.stringify({
      type: issue.type ?? null,
      issueType: issue.issueType ?? null,
      captureId: issue.captureId ?? null,
      fullPath: issue.fullPath ?? null,
      message: issue.message ?? null,
      from: issue.from ?? null,
      to: issue.to ?? null,
      error: issue.error ?? null,
    });
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(issue);
  });
  return deduped;
}

function evaluateUiVerifySnapshots({
  snapshots,
  captureId = null,
  requireSelected = false,
  allowResetsForCaptures = [],
}) {
  const failures = [];
  const transientIssues = [];
  const captureTraces = new Map();
  const metricTraces = new Map();
  const allowResets = new Set(
    Array.isArray(allowResetsForCaptures)
      ? allowResetsForCaptures.map((value) => String(value)).filter(Boolean)
      : [],
  );

  snapshots.forEach((snapshot) => {
    const check = snapshot.check?.report ?? null;
    const debug = snapshot.debug ?? null;
    if (!check || !Array.isArray(check.captures)) {
      failures.push({
        type: 'missing-check-report',
        message: 'Missing capture check report in snapshot.',
      });
      return;
    }
    const loadingProbe = normalizeLoadingProbe(debug);
    const loading = isLoadingActive(loadingProbe);
    const liveStatusMap = toLiveStatusMap(debug);
    const captureStateById = new Map(
      check.captures
        .filter((entry) => entry && typeof entry.captureId === 'string')
        .map((entry) => [entry.captureId, entry]),
    );
    const selectedMetrics = Array.isArray(snapshot.check?.selectedMetrics)
      ? snapshot.check.selectedMetrics
      : [];
    const coverageMetrics = Array.isArray(snapshot.coverage?.metrics) ? snapshot.coverage.metrics : [];
    const coverageByKey = new Map(
      coverageMetrics
        .filter((entry) => entry && typeof entry.captureId === 'string' && typeof entry.fullPath === 'string')
        .map((entry) => [`${entry.captureId}::${entry.fullPath}`, entry]),
    );

    if (Array.isArray(check.issues) && check.issues.length > 0) {
      check.issues.forEach((issue) => {
        const issueCaptureId =
          issue && typeof issue.captureId === 'string' && issue.captureId.length > 0
            ? issue.captureId
            : null;
        const issueLiveStatus = issueCaptureId ? (liveStatusMap.get(issueCaptureId) ?? 'idle') : null;
        const issueCaptureState = issueCaptureId ? captureStateById.get(issueCaptureId) : null;
        const issueSelectedCount = Number(issueCaptureState?.selectedMetricCount) || 0;
        const issueTickCount = Number(issueCaptureState?.tickCount) || 0;
        const issueRecordCount = Number(issueCaptureState?.recordCount) || 0;
        const issueType = issue?.type ?? 'unknown';
        const stableWithoutRecords =
          issueType === 'no-records-for-selected-metrics'
          && issueSelectedCount > 0
          && issueTickCount > 0
          && issueRecordCount === 0
          && isLiveStatusStable(issueLiveStatus || 'idle');
        const treatAsTransient =
          !stableWithoutRecords
          && loading
          && (issueCaptureId ? isLiveStatusLoading(issueLiveStatus) : true);

        const normalizedIssue = {
          type: 'check-issue',
          issueType: issueType,
          captureId: issueCaptureId,
          liveStatus: issueLiveStatus,
          detail: issue,
        };
        if (treatAsTransient) {
          transientIssues.push(normalizedIssue);
        } else {
          failures.push(normalizedIssue);
        }
      });
    }

    check.captures.forEach((capture) => {
      const id = String(capture.captureId || '');
      if (!id) {
        return;
      }
      if (captureId && id !== captureId) {
        return;
      }
      const entry = {
        checkedAt: check.checkedAt ?? null,
        tickCount: Number(capture.tickCount) || 0,
        recordCount: Number(capture.recordCount) || 0,
        selectedMetricCount: Number(capture.selectedMetricCount) || 0,
        loading,
        loadingProbe,
        liveStatus: liveStatusMap.get(id) ?? 'idle',
      };
      if (!captureTraces.has(id)) {
        captureTraces.set(id, []);
      }
      captureTraces.get(id).push(entry);
    });

    selectedMetrics.forEach((metric) => {
      if (!metric || typeof metric.captureId !== 'string' || typeof metric.fullPath !== 'string') {
        return;
      }
      const id = metric.captureId;
      if (captureId && id !== captureId) {
        return;
      }
      const key = `${id}::${metric.fullPath}`;
      const coverage = coverageByKey.get(key);
      const sample = {
        checkedAt: check.checkedAt ?? null,
        numericCount: Number(coverage?.numericCount) || 0,
        total: Number(coverage?.total) || 0,
        lastTick: Number(coverage?.lastTick) || 0,
        loading,
        liveStatus: liveStatusMap.get(id) ?? 'idle',
      };
      const existing = metricTraces.get(key);
      if (existing) {
        existing.samples.push(sample);
      } else {
        metricTraces.set(key, {
          key,
          captureId: id,
          fullPath: metric.fullPath,
          label: typeof metric.label === 'string' ? metric.label : metric.fullPath,
          samples: [sample],
        });
      }
    });
  });

  if (captureTraces.size === 0) {
    failures.push({
      type: 'no-captures',
      message: captureId
        ? `Capture ${captureId} not found in verification snapshots.`
        : 'No captures found in verification snapshots.',
    });
  }

  const captureSummaries = [];
  captureTraces.forEach((trace, id) => {
    const first = trace[0];
    const last = trace[trace.length - 1];
    if (!first || !last) {
      return;
    }

    if (requireSelected && last.selectedMetricCount <= 0) {
      failures.push({
        type: 'no-selected-metrics',
        captureId: id,
        message: `Capture ${id} has no selected metrics.`,
      });
    }

    if (last.tickCount < 0 || last.recordCount < 0) {
      failures.push({
        type: 'negative-count',
        captureId: id,
        tickCount: last.tickCount,
        recordCount: last.recordCount,
      });
    }

    if (last.recordCount > last.tickCount && !isLiveStatusLoading(last.liveStatus)) {
      failures.push({
        type: 'record-count-exceeds-tick-count',
        captureId: id,
        tickCount: last.tickCount,
        recordCount: last.recordCount,
      });
    }

    for (let index = 1; index < trace.length; index += 1) {
      const prev = trace[index - 1];
      const next = trace[index];
      if (next.tickCount < prev.tickCount) {
        const isAllowedTickReset = (
          allowResets.has(id)
          && prev.tickCount > 0
          && next.tickCount >= 0
          && next.tickCount <= 2
        );
        if (isAllowedTickReset) {
          continue;
        }
        failures.push({
          type: 'tick-count-decreased',
          captureId: id,
          from: prev.tickCount,
          to: next.tickCount,
          at: next.checkedAt ?? null,
        });
      }
      if (next.recordCount < prev.recordCount) {
        const isAllowedRecordReset = (
          allowResets.has(id)
          && prev.recordCount > 0
          && next.recordCount >= 0
          && next.recordCount <= 2
        );
        if (isAllowedRecordReset) {
          continue;
        }
        failures.push({
          type: 'record-count-decreased',
          captureId: id,
          from: prev.recordCount,
          to: next.recordCount,
          at: next.checkedAt ?? null,
        });
      }
    }

    const tickDelta = last.tickCount - first.tickCount;
    const recordDelta = last.recordCount - first.recordCount;
    if (
      last.selectedMetricCount > 0
      && tickDelta > 0
      && recordDelta <= 0
      && !isLiveStatusLoading(last.liveStatus)
    ) {
      failures.push({
        type: 'no-record-growth-while-ticks-grew',
        captureId: id,
        tickDelta,
        recordDelta,
      });
    }

    if (
      last.selectedMetricCount > 0
      && isLiveStatusStable(last.liveStatus)
      && last.tickCount > 0
      && last.recordCount === 0
    ) {
      failures.push({
        type: 'completed-without-records',
        captureId: id,
        tickCount: last.tickCount,
      });
    }

    captureSummaries.push({
      captureId: id,
      firstTickCount: first.tickCount,
      lastTickCount: last.tickCount,
      firstRecordCount: first.recordCount,
      lastRecordCount: last.recordCount,
      tickDelta,
      recordDelta,
      selectedMetricCount: last.selectedMetricCount,
      liveStatus: last.liveStatus,
      loadingAtEnd: last.loading,
      sampleCount: trace.length,
    });
  });

  const metricSummaries = [];
  metricTraces.forEach((trace, key) => {
    const samples = Array.isArray(trace.samples) ? trace.samples : [];
    if (samples.length === 0) {
      return;
    }
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last) {
      return;
    }
    let increments = 0;
    for (let index = 1; index < samples.length; index += 1) {
      const prev = samples[index - 1];
      const next = samples[index];
      if (next.numericCount < prev.numericCount) {
        failures.push({
          type: 'metric-numeric-count-decreased',
          captureId: trace.captureId,
          fullPath: trace.fullPath,
          from: prev.numericCount,
          to: next.numericCount,
          at: next.checkedAt ?? null,
        });
      }
      if (next.numericCount > next.total && next.total > 0) {
        failures.push({
          type: 'metric-numeric-count-exceeds-total',
          captureId: trace.captureId,
          fullPath: trace.fullPath,
          numericCount: next.numericCount,
          total: next.total,
          at: next.checkedAt ?? null,
        });
      }
      if (next.numericCount > prev.numericCount) {
        increments += 1;
      }
    }
    const hadLoadingWindow = samples.some(
      (sample) => sample.loading || sample.liveStatus === 'connecting' || sample.liveStatus === 'retrying',
    );
    const delta = last.numericCount - first.numericCount;
    if (
      hadLoadingWindow
      && first.numericCount === 0
      && last.numericCount > 0
      && last.total > 0
    ) {
      const requiredSteps = last.numericCount >= 50 ? 2 : 1;
      if (increments < requiredSteps) {
        failures.push({
          type: 'non-progressive-metric-population',
          captureId: trace.captureId,
          fullPath: trace.fullPath,
          increments,
          requiredSteps,
          firstNumericCount: first.numericCount,
          lastNumericCount: last.numericCount,
          total: last.total,
        });
      }
    }
    if (last.liveStatus === 'completed' && last.total > 0 && last.numericCount === 0) {
      failures.push({
        type: 'completed-metric-without-values',
        captureId: trace.captureId,
        fullPath: trace.fullPath,
        total: last.total,
      });
    }
    metricSummaries.push({
      key,
      captureId: trace.captureId,
      fullPath: trace.fullPath,
      label: trace.label,
      firstNumericCount: first.numericCount,
      lastNumericCount: last.numericCount,
      total: last.total,
      delta,
      increments,
      liveStatus: last.liveStatus,
      loadingAtEnd: last.loading,
      sampleCount: samples.length,
    });
  });

  const normalizedFailures = dedupeIssueList(failures);
  const normalizedTransientIssues = dedupeIssueList(transientIssues);
  const report = {
    status: normalizedFailures.length > 0 ? 'failed' : (normalizedTransientIssues.length > 0 ? 'warning' : 'ok'),
    checkedAt: new Date().toISOString(),
    captureId: captureId ? String(captureId) : 'all',
    captures: captureSummaries,
    metrics: metricSummaries,
    failures: normalizedFailures,
    transientIssues: normalizedTransientIssues,
  };
  return report;
}

async function collectUiVerifyReport(
  socket,
  {
    captureId = null,
    windowSize = undefined,
    windowStart = undefined,
    windowEnd = undefined,
    timeoutMs = 5000,
    requestIdBase = null,
    observeMs = 5000,
    intervalMs = 1000,
    requireSelected = false,
    allowResetsForCaptures = [],
  } = {},
) {
  const start = Date.now();
  const snapshots = [];
  let index = 0;
  while (true) {
    const sampleRequestBase = `${requestIdBase || buildMessageId(null, 'ui-verify')}-sample-${index + 1}`;
    const check = await collectUiCheckReport(socket, {
      captureId,
      windowSize,
      windowStart,
      windowEnd,
      timeoutMs,
      requestIdBase: sampleRequestBase,
    });
    const debug = await collectUiDebugSnapshot(socket, {
      timeoutMs,
      requestIdBase: sampleRequestBase,
    });
    const coverage = await collectUiMetricCoverageSnapshot(socket, {
      captureId,
      timeoutMs,
      requestIdBase: sampleRequestBase,
    });
    snapshots.push({
      sampledAt: new Date().toISOString(),
      check,
      debug,
      coverage,
    });

    index += 1;
    const elapsed = Date.now() - start;
    const shouldContinue = elapsed < observeMs;
    if (!shouldContinue) {
      break;
    }
    await delay(Math.min(intervalMs, Math.max(1, observeMs - elapsed)));
  }

  const report = evaluateUiVerifySnapshots({
    snapshots,
    captureId,
    requireSelected,
    allowResetsForCaptures,
  });

  report.observeMs = observeMs;
  report.intervalMs = intervalMs;
  report.samples = snapshots.map((snapshot) => {
    const checkReport = snapshot.check?.report ?? {};
    const loadingProbe = normalizeLoadingProbe(snapshot.debug);
    return {
      sampledAt: snapshot.sampledAt,
      checkStatus: checkReport.status ?? 'unknown',
      issueCount: Array.isArray(checkReport.issues) ? checkReport.issues.length : 0,
      loadingProbe,
      captures: Array.isArray(checkReport.captures)
        ? checkReport.captures.map((entry) => ({
          captureId: entry.captureId,
          tickCount: entry.tickCount,
          recordCount: entry.recordCount,
          selectedMetricCount: entry.selectedMetricCount,
        }))
        : [],
      metricCoverageCount: Array.isArray(snapshot.coverage?.metrics) ? snapshot.coverage.metrics.length : 0,
    };
  });

  return { report };
}

function printUiSuccess(action, uiUrl, requestId, details = {}) {
  printJson({
    status: 'success',
    action,
    uiUrl,
    requestId,
    ...details,
  });
}

async function forwardStream({
  url,
  uiUrl,
  maxFrames,
  durationMs,
  componentId,
  entityId,
  authHeader,
  captureId,
  filename,
}) {
  const socket = await connectWebSocket(uiUrl);
  let socketClosed = false;
  socket.addEventListener('close', () => {
    socketClosed = true;
  });

  sendWsMessage(socket, { type: 'register', role: 'agent' });
  await waitForWsAck(socket);
  const stopErrorLog = attachWsErrorLogger(socket, { captureId, label: 'stream forward' });
  const initRequestId = buildMessageId(null, `capture-init-${captureId}`);
  sendWsMessage(socket, { type: 'capture_init', captureId, filename, request_id: initRequestId });
  await waitForWsResponse(socket, { requestId: initRequestId, types: ['ack'], timeoutMs: 4000 });

  const headers = {
    Accept: 'text/event-stream',
    'User-Agent': 'simeval-cli/1.0',
  };
  const controller = new AbortController();
  if (durationMs) {
    setTimeout(() => controller.abort(), durationMs);
  }

  const response = await fetch(url, applyAuth({ headers, signal: controller.signal }, authHeader));
  if (!response.ok) {
    controller.abort();
    throw new Error(`SSE request failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    controller.abort();
    throw new Error('SSE response missing readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let frameCount = 0;
  let ackCount = 0;
  let recordCount = 0;
  let stop = false;

  try {
    while (!stop && !socketClosed) {
      const result = await reader.read();
      if (!result || result.done) {
        break;
      }
      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });
        const processed = processSseBuffer(buffer, (message) => {
          if (isFrameMessage(message)) {
            let frame = message;
            if (componentId) {
              frame = filterFrame(frame, componentId, entityId);
              if (!frame) {
                return true;
              }
            }
            frameCount += 1;
            recordCount += 1;
            sendWsMessage(socket, { type: 'capture_append', captureId, frame });
            if (maxFrames && frameCount >= maxFrames) {
              stop = true;
              return false;
            }
            return true;
          }

          if (isAckMessage(message)) {
            ackCount += 1;
          }
          return true;
        });
        buffer = processed.buffer;
        if (processed.stop) {
          stop = true;
        }
      }
    }
  } catch (error) {
    if (!(controller.signal.aborted && error.name === 'AbortError')) {
      throw error;
    }
  } finally {
    controller.abort();
    await reader.cancel().catch(() => undefined);
    sendWsMessage(socket, { type: 'capture_end', captureId });
    socket.close();
  }

  return {
    uiUrl,
    captureId,
    recordCount,
    frameCount,
    ackCount,
    durationMs: durationMs ?? null,
  };
}

function buildMultipartUploadStream({ filePath, filename, boundary }) {
  const safeName = String(filename || path.basename(filePath)).replace(/"/g, "'");
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeName}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  async function* streamParts() {
    const fileStream = fs.createReadStream(filePath);
    try {
      yield header;
      for await (const chunk of fileStream) {
        yield chunk;
      }
      yield footer;
    } finally {
      fileStream.destroy();
    }
  }

  return Readable.from(streamParts());
}

async function uploadCaptureFileHttp({ uiUrl, filename, filePath }) {
  const endpoint = new URL('/api/upload', uiUrl).toString();
  const boundary = `simeval-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  const body = buildMultipartUploadStream({ filePath, filename, boundary });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
    duplex: 'half',
  });

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorMessage =
      (payload && payload.error) ||
      responseText ||
      response.statusText ||
      'Upload failed.';
    throw new Error(`Upload failed (${response.status}): ${errorMessage}`);
  }

  if (!payload || !payload.captureId) {
    throw new Error('Upload response missing captureId.');
  }

  return {
    uiUrl,
    captureId: payload.captureId,
    filename: payload.filename || filename || path.basename(filePath),
    size: payload.size ?? null,
  };
}

function createRecordWriter(outputPath, format) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  let started = false;
  let first = true;
  let pending = Promise.resolve();

  function writeChunk(chunk) {
    if (!stream.write(chunk)) {
      return new Promise((resolve) => stream.once('drain', resolve));
    }
    return Promise.resolve();
  }

  async function writeRecord(record) {
    if (!started && format === 'json') {
      started = true;
      await writeChunk('[\n');
    }
    const payload = JSON.stringify(record);
    if (format === 'json') {
      const prefix = first ? '  ' : ',\n  ';
      first = false;
      await writeChunk(`${prefix}${payload}`);
    } else {
      await writeChunk(`${payload}\n`);
    }
  }

  async function close() {
    await pending;
    if (format === 'json') {
      if (!started) {
        await writeChunk('[]\n');
      } else {
        await writeChunk('\n]\n');
      }
    }
    await new Promise((resolve) => stream.end(resolve));
  }

  function write(record) {
    pending = pending.then(() => writeRecord(record));
    return pending;
  }

  return { write, close };
}

function processSseBuffer(text, onMessage) {
  let working = text;
  let stop = false;
  let delimiterIndex;
  while ((delimiterIndex = working.indexOf('\n\n')) >= 0) {
    const chunk = working.slice(0, delimiterIndex).trim();
    working = working.slice(delimiterIndex + 2);
    if (!chunk) {
      continue;
    }
    const payload = extractEventData(chunk);
    if (!payload) {
      continue;
    }
    const shouldContinue = onMessage(payload);
    if (shouldContinue === false) {
      stop = true;
      break;
    }
  }
  return { buffer: working, stop };
}

function extractEventData(chunk) {
  const lines = chunk.split('\n');
  const dataLines = [];
  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) {
    return null;
  }
  try {
    return JSON.parse(dataLines.join('\n'));
  } catch {
    return null;
  }
}

function isFrameMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    Number.isFinite(message.tick) &&
    message.entities &&
    typeof message.entities === 'object'
  );
}

function isAckMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.status === 'string' &&
    (message.status === 'success' || message.status === 'error')
  );
}

function extractComponentRecords(frame, componentId, entityFilter) {
  const matches = [];
  const entities = frame.entities ?? {};
  for (const [entityId, components] of Object.entries(entities)) {
    if (entityFilter && entityFilter !== entityId) {
      continue;
    }
    if (!components || typeof components !== 'object') {
      continue;
    }
    if (!(componentId in components)) {
      continue;
    }
    matches.push({
      tick: frame.tick,
      entityId,
      componentId,
      value: components[componentId],
    });
  }
  return matches;
}

function filterFrame(frame, componentId, entityFilter) {
  const entities = frame.entities ?? {};
  const filtered = Object.create(null);

  for (const [entityId, components] of Object.entries(entities)) {
    if (entityFilter && entityFilter !== entityId) {
      continue;
    }
    if (!components || typeof components !== 'object') {
      continue;
    }
    if (!(componentId in components)) {
      continue;
    }
    filtered[entityId] = { [componentId]: components[componentId] };
  }

  if (Object.keys(filtered).length === 0) {
    return null;
  }

  return { ...frame, entities: filtered };
}

function printUsage(command) {
  if (command && typeof command === 'string' && command !== 'health' && command !== 'status') {
    console.error(`[simeval-cli] ${command}`);
  }
  console.log('Usage:');
  console.log('  simeval <command> [options]\n');
  console.log('Commands:');
  console.log('  health                        Check server health');
  console.log('  status                        Show simulation/evaluation status (use --all for recorded deployments)');
  console.log('  start | pause | stop          Control simulation playback');
  console.log('  system inject|eject            Inject or eject a system');
  console.log('  component inject|eject         Inject or eject a component type');
  console.log('  plugin upload                 Upload plugin source to the server');
  console.log('  stream capture|forward|upload  Capture, forward, or upload stream data');
  console.log('  ui <command>                   Control the Metrics UI over WebSocket');
  console.log('  config show|set             Manage CLI defaults');
  console.log('  run create|show|record         Manage and record run metadata');
  console.log('  deploy start|stop|list         Start/stop/list local SimEval deployments');
  console.log('  morphcloud <command>           Manage Morphcloud fleets via the distributor');
  console.log('  fleet [scaffold]               Run Morphcloud deployments or write a config scaffold');
  console.log('  log list|view                  Inspect CLI log files');
  console.log('  codebase tree|file             Explore the server codebase tree/files');
  console.log('  wait                          Poll /status until a state is reached\n');
  console.log('Global options:');
  console.log('  --server       Base server URL (default: http://127.0.0.1:3000/api)');
  console.log('  --token        Authorization token (Bearer prefix optional)');
  console.log('  --cli-config   Path to CLI config JSON (default: ~/.simeval/config.json)');
  console.log('  --run          Path to run directory or run.json');
  console.log('  --message-id   Override generated message id');
  console.log('  --help         Show command help\n');
  console.log('Status options:');
  console.log('  --all          Check recorded deployments');
  console.log('  --prune        Remove unhealthy local deployments (kills processes)');
  console.log('  --prune-morph  Remove unhealthy morphcloud instances from state');
  console.log('  --stop-morph   Stop unhealthy morphcloud instances before pruning');
  console.log('  --state        Deploy state file (default: ~/.simeval/deployments.json)');
  console.log('  --ui-state     UI state file (default: ~/.simeval/ui.json)');
  console.log('  --morph-state  Morphcloud state file (default: ~/.simeval/morphcloud.json)');
  console.log('  --timeout      Probe/stop timeout in ms (default: 2000)');
  console.log('  --signal       Signal for pruning local deployments (default: SIGTERM)\n');
  console.log('System/component options:');
  console.log('  --player       simulation (default) or evaluation');
  console.log('  --module       Module path under plugins/');
  console.log('  --export       Export name (optional)');
  console.log('  --system-id    System id for eject');
  console.log('  --component-id Component id for eject\n');
  console.log('Plugin options:');
  console.log('  --source       Local plugin file path');
  console.log('  --dest         Target plugin path under plugins/');
  console.log('  --overwrite    Replace existing plugin file\n');
  console.log('Stream options:');
  console.log('  --stream       simulation|evaluation|/custom/path');
  console.log('  --frames       Max frames to capture/forward');
  console.log('  --duration     Max capture duration in ms');
  console.log('  --format       jsonl (default) or json');
  console.log('  --component    Component id filter');
  console.log('  --entity       Entity id filter');
  console.log('  --include-acks Include SSE ack messages (capture only)');
  console.log('  --out          Output file path (capture)');
  console.log('  --file         Capture file to upload');
  console.log('  --name         Filename override for UI uploads');
  console.log('  --foreground   Run stream forward in the foreground\n');
  console.log('UI options:');
  console.log('  --ui           Metrics UI websocket or http(s) URL');
  console.log('  --capture-id   Capture id for live streams or metric selection');
  console.log('  --source       Live capture source file path or URL');
  console.log('  --mode         Source mode for ui mode (file|live)');
  console.log('  --ui-dir       Metrics UI directory for ui serve');
  console.log('  --ui-host      Metrics UI host for ui serve');
  console.log('  --ui-port      Metrics UI port for ui serve');
  console.log('  --ui-mode      Metrics UI mode for ui serve (dev|start)');
  console.log('  --skip-install Skip npm install for ui serve');
  console.log('  --path         Metric path (JSON array recommended for dotted keys)');
  console.log('  --full-path    Full metric path for ui deselect');
  console.log('  --axis         Axis assignment for ui metric-axis (y1|y2)');
  console.log('  --group-id     Derivation group id (ui derivation-group-*)');
  console.log('  --new-group-id New derivation group id (ui derivation-group-update)');
  console.log('  --file         Plugin file path (ui derivation-plugin-upload)');
  console.log('  --plugin-id    Derivation plugin id (ui derivation-plugin-run)');
  console.log('  --params       Derivation plugin params as JSON (ui derivation-plugin-run)');
  console.log('  --kind         Derivation kind for ui derivation-run (diff|moving_average)');
  console.log('  --window       Derivation window size (ui derivation-run)');
  console.log('  --input-index  Input metric index (ui derivation-run moving_average)');
  console.log('  --left-index   Left metric index (ui derivation-run diff)');
  console.log('  --right-index  Right metric index (ui derivation-run diff)');
  console.log('  --from-index   Source metric index (ui derivation-group-reorder)');
  console.log('  --to-index     Target metric index (ui derivation-group-reorder)');
  console.log('  --output-capture-id Output capture id for derivation runs');
  console.log('  --wait-complete Wait for derivation completion event (ui derivation-run / derivation-plugin-run)');
  console.log('  --wait-complete-timeout Wait timeout in ms for completion event');
  console.log('  --request-id   Request id for ui trace (or set via --message-id)');
  console.log('  --include-ack  Include ack events in ui trace (true|false)');
  console.log('  --send         JSON command to send from ui trace socket');
  console.log('  --fix          Apply doctor remediation actions (ui doctor)');
  console.log('  --tick         Tick for ui seek');
  console.log('  --speed        Playback speed multiplier');
  console.log('  --window-size  Window size for ui display/series/table');
  console.log('  --window-start Window start tick for ui window range');
  console.log('  --window-end   Window end tick for ui window range');
  console.log('  --min          Numeric minimum for ui y-range / y2-range');
  console.log('  --max          Numeric maximum for ui y-range / y2-range');
  console.log('  --enabled      Enable/disable ui auto-scroll/fullscreen (true|false)');
  console.log('  --annotation-id Annotation id for ui annotation commands');
  console.log('  --subtitle-id  Subtitle id for ui subtitle commands');
  console.log('  --start-tick   Subtitle start tick');
  console.log('  --end-tick     Subtitle end tick');
  console.log('  --label        Annotation label for ui add-annotation');
  console.log('  --text         Subtitle text for ui add-subtitle');
  console.log('  --color        Annotation color for ui add-annotation');
  console.log('  --direction    Annotation jump direction (next|previous)');
  console.log('  --poll-ms      Live poll interval in milliseconds');
  console.log('  --poll-seconds Live poll interval in seconds');
  console.log('  --frames       Generated frame count for ui verify-regression');
  console.log('  --observe-ms   Verification observation window in ms (ui verify / ui verify-regression / ui verify-flow)');
  console.log('  --require-selected Require selected metrics in verification (ui verify / ui verify-regression / ui verify-flow)');
  console.log('  --auto-serve   Auto-start Metrics UI if not running (ui verify / ui verify-regression)');
  console.log('  --shutdown-on-exit Shutdown auto-started Metrics UI after verify (ui verify / ui verify-regression)');
  console.log('  --timeout      WebSocket wait timeout in ms\n');
  console.log('UI serve options:');
  console.log('  --ui-dir       Metrics UI project directory (default: ./Stream-Metrics-UI)');
  console.log('  --ui-host      Metrics UI host (default: 127.0.0.1)');
  console.log('  --ui-port      Metrics UI port (default: 5050)');
  console.log('  --ui-mode      dev (default) or start');
  console.log('  --skip-install Skip npm install if node_modules missing\n');
  console.log('UI subcommands:');
  console.log('  serve | shutdown | capabilities | state | components | mode | live-source | live-start | live-stop | live-status');
  console.log('  select | deselect | metric-axis | analysis-select | analysis-deselect | analysis-clear | remove-capture | clear | clear-captures | play | pause | stop | seek | speed');
  console.log('  derivation-group-create | derivation-group-delete | derivation-group-active | derivation-group-update | derivation-group-display | derivation-group-reorder');
  console.log('  derivation-run | derivation-plugins | derivation-plugin-run');
  console.log('  derivation-plugin-upload | derivation-plugin-source | derivation-plugin-delete');
  console.log('  trace');
  console.log('  window-size | window-start | window-end | window-range | y-range | y2-range | auto-scroll | fullscreen');
  console.log('  add-annotation | remove-annotation | clear-annotations | jump-annotation');
  console.log('  add-subtitle | remove-subtitle | clear-subtitles');
  console.log('  display-snapshot | series-window | render-table | render-debug | debug | memory-stats | metric-coverage | check | verify | verify-regression | verify-flow | doctor\n');
  console.log('  note: ui verify is server-driven (HTTP) and does not require a connected frontend session.');
  console.log('        ui verify-regression is a one-command regression exercise with generated stream + derivation checks.');
  console.log('        ui verify-flow is active/ws-driven and mutates capture state to exercise load paths.\n');
  console.log('Run options:');
  console.log('  --name         Run name (create)');
  console.log('  --notes        Run notes (create)');
  console.log('  --no-start     Skip playback start (record)');
  console.log('  --pause        Pause instead of stop after record');
  console.log('  --no-stop      Skip playback stop/pause after record\n');
  console.log('Wait options:');
  console.log('  --state        Desired player state');
  console.log('  --player       simulation (default) or evaluation');
  console.log('  --timeout      Timeout in ms (default: 30000)');
  console.log('  --interval     Poll interval in ms (default: 500)\n');
  console.log('Codebase options:');
  console.log('  --path         Path for tree/file (or --file for file)\n');
  console.log('Deploy start options:');
  console.log('  --port         Port to bind (default: 3000)');
  console.log('  --host         Host to bind (default: 127.0.0.1)');
  console.log('  --workspace    Workspace directory (default: workspaces/Describing_Simulation_0)');
  console.log('  --clean-plugins Remove plugin files before starting');
  console.log('  --build        Force rebuild before start (default)');
  console.log('  --no-build     Skip build (requires dist/main.js)');
  console.log('  --no-auto-start-eval Disable evaluation auto-start');
  console.log('  --log          Log file path (defaults to ~/.simeval/logs/...)');
  console.log('  --log-dir      Log directory (default: ~/.simeval/logs)');
  console.log('  --state        Deploy state file path');
  console.log('  --force        Replace an existing deployment on the port');
  console.log('  --auto-start-eval Enable evaluation auto-start');
  console.log('  --wait         Wait for /health to respond');
  console.log('  --wait-timeout Wait timeout in ms (default: 30000)');
  console.log('  --wait-interval Poll interval in ms (default: 500)\n');
  console.log('Deploy stop options:');
  console.log('  --port         Port to stop');
  console.log('  --pid          PID to stop');
  console.log('  --all          Stop all recorded deployments');
  console.log('  --signal       Signal to send (default: SIGTERM)');
  console.log('  --timeout      Wait timeout in ms (default: 2000)\n');
  console.log('Fleet options:');
  console.log('  --config       Fleet config JSON file (defaults to fleetConfig in ~/.simeval/config.json)');
  console.log('  --ui           Override UI websocket or http(s) URL');
  console.log('  --continue-on-error Continue on instance/deployment failures');
  console.log('  --out          Scaffold output path (fleet scaffold)');
  console.log('  --force        Overwrite existing scaffold file\n');
  console.log('Log options:');
  console.log('  --type         Log type filter (list/view)');
  console.log('  --file         Log filename to view');
  console.log('  --id           Log id/prefix to view');
  console.log('  --log-dir      Log directory (default: ~/.simeval/logs/cli)\n');
  if (!command || command === 'config') {
    console.log('Config options:');
    console.log('  --server       Default server URL');
    console.log('  --token        Default auth token');
    console.log('  --morph-api-key Default Morphcloud API key');
    console.log('  --snapshot     Default snapshot id');
    console.log('  --fleet-config Default fleet config path');
    console.log('  --workspace    Default workspace directory');
    console.log('  --ui           Default Metrics UI URL');
    console.log('  --ui-dir       Default Metrics UI directory');
    console.log('  --ui-host      Default Metrics UI host');
    console.log('  --ui-port      Default Metrics UI port');
    console.log('  --ui-mode      Default Metrics UI mode (dev|start)');
    console.log('');
  }
  if (!command || command === 'fleet') {
    console.log('Fleet config (JSON):');
    console.log('  - Top-level: { ui?, defaults?, deployments: [ ... ] }');
    console.log('  - ui: { url, pollSeconds }');
    console.log('  - defaults/deployments: snapshot, mode (build|clone), count, parallel,');
    console.log('    readyTimeoutMs, readyIntervalMs, captureMode (parallel|sequential)');
    console.log('  - provision: { args?, stateFile?, skipUpdate?, requireUpdate?, memory?, vcpus? }');
    console.log('  - playback: { start?, stop?, pause? }');
    console.log('  - postProvision.exec: [ \"shell command\", ... ]');
    console.log('  - labels: { instance?, snapshot? } (metadata entries, key=value)');
    console.log('  - cleanup: { snapshot?, stop?, stopOnFailure?, forget? }');
    console.log('  - plugins: [ \"plugins/...\", { source, dest, overwrite? } ]');
    console.log('  - components/systems: { player, module, export }');
    console.log('  - captures: { stream, out, frames|durationMs|duration|durationSeconds|durationSec, format?,');
    console.log('      component?, entity?, includeAcks?, ui?: { captureId?, filename?, pollSeconds? } }');
    console.log('  - Templates: ${deployment} ${instance} ${index} ${instanceId} ${runId} in out/captureId/filename\n');
  }
  console.log('Examples:');
  console.log('  # Health + playback');
  console.log('  simeval health --server http://127.0.0.1:3000/api');
  console.log('  simeval status --all');
  console.log('  simeval status --all --prune');
  console.log('  simeval start --server http://127.0.0.1:3000/api');
  console.log('  ');
  console.log('  # Plugins + ECS injection');
  console.log('  simeval plugin upload --source ./mySystem.js --dest plugins/simulation/systems/mySystem.js');
  console.log('  simeval system inject --player simulation --module plugins/simulation/systems/mySystem.js --export createSystem');
  console.log('  ');
  console.log('  # Stream capture + UI');
  console.log('  simeval stream capture --stream simulation --frames 50 --out sim.jsonl');
  console.log('  simeval stream forward --stream evaluation --frames 50 --ui ws://localhost:5050/ws/control');
  console.log('  simeval stream upload --file capture.jsonl --ui http://localhost:5050');
  console.log('  simeval ui serve --ui-dir Stream-Metrics-UI');
  console.log('  simeval ui live-start --source /path/to/capture.jsonl --capture-id live-a --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui select --capture-id live-a --path \'[\"1\",\"highmix.metrics\",\"shift_capacity_pressure\",\"overall\"]\' --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui metric-axis --capture-id live-a --full-path 1.highmix.metrics.shift_capacity_pressure.overall --axis y2 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui y-range --min 0 --max 120 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui y2-range --min 0.8 --max 1.0 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui analysis-select --capture-id live-a --path \'[\"1\",\"highmix.metrics\",\"shift_capacity_pressure\",\"overall\"]\' --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui derivation-group-display --group-id compare_pending_jobs --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui derivation-group-reorder --group-id compare_pending_jobs --from-index 0 --to-index 1 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui derivation-plugin-upload --file ./examples/derivation-plugins/diff.mjs --ui http://localhost:5050');
  console.log('  simeval ui derivation-plugins --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui derivation-plugin-source --plugin-id diff --ui http://localhost:5050');
  console.log('  simeval ui derivation-plugin-run --group-id compare_pending_jobs --plugin-id diff --output-capture-id pending_diff --wait-complete --ui ws://localhost:5050/ws/control');
  console.log('  simeval --message-id trace-123 ui derivation-plugin-run --group-id compare_pending_jobs --plugin-id diff --output-capture-id pending_diff --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui trace --request-id trace-123 --timeout 30000 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui trace --request-id trace-123 --send \'{"type":"run_derivation_plugin","groupId":"compare_pending_jobs","pluginId":"diff","outputCaptureId":"pending_diff"}\' --timeout 30000 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui derivation-plugin-delete --plugin-id diff --ui http://localhost:5050');
  console.log('  simeval ui debug --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui check --capture-id live-a --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui verify --observe-ms 5000 --interval 1000 --require-selected true --ui http://localhost:5050');
  console.log('  simeval ui verify-regression --frames 24000 --observe-ms 8000 --interval 400 --auto-serve true --shutdown-on-exit true --ui http://localhost:5050');
  console.log('  simeval ui verify-flow --observe-ms 12000 --interval 1000 --ui ws://localhost:5050/ws/control');
  console.log('  simeval ui doctor --fix --ui ws://localhost:5050/ws/control');
  console.log('  ');
  console.log('  # Runs + logs');
  console.log('  simeval run create --name demo --server http://127.0.0.1:3000/api');
  console.log('  simeval run record --run runs/run-123 --frames 25 --stream evaluation');
  console.log('  simeval log list --type ui');
  console.log('  simeval log view --file ui_20260101T120000.log');
  console.log('  ');
  console.log('  # Deploy management');
  console.log('  simeval deploy start --port 4000 --workspace ./workspaces/Describing_Simulation_0');
  console.log('  simeval deploy start --port 4000 --clean-plugins --wait');
  console.log('  simeval deploy stop --port 4000');
  console.log('  ');
  console.log('  # Meta / orchestration');
  console.log('  simeval morphcloud list');
  console.log('  simeval fleet scaffold --out fleet.json');
  console.log('  simeval fleet --config fleet.json --ui ws://localhost:5050/ws/control');
  console.log('  simeval codebase tree --server http://127.0.0.1:3000/api');
}
