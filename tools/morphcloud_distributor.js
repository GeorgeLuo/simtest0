#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

main().catch((error) => {
  console.error(`[morphcloud-distributor] ${error.message ?? error}`);
  process.exit(1);
});

async function main() {
  const [command, ...rest] = argv;

  switch (command) {
    case 'provision':
    case 'create':
      return handleProvision(rest);
    case 'list':
      return handleList(rest);
    case 'stop':
      return handleStop(rest);
    case 'simeval':
      return handleSimeval(rest);
    case 'validate':
      return handleValidate(rest);
    case 'update':
      return handleUpdate(rest);
    default:
      printUsage(`Unknown command: ${command}`);
      return undefined;
  }
}

async function handleProvision(argvRest) {
  const { options, positional, passthrough } = parseArgs(argvRest);
  if (options.help) {
    printUsage('provision');
    return;
  }

  if (positional.length > 0) {
    throw new Error('Unexpected positional arguments. Use -- to pass through options to the provision script.');
  }

  const snapshot = String(options.snapshot || '').trim();
  if (!snapshot) {
    throw new Error('Missing --snapshot for provision.');
  }

  const mode = normalizeMode(options.mode || 'build');
  const count = parsePositiveInt(options.count ?? 1, 'count');
  const parallel = parsePositiveInt(options.parallel ?? 1, 'parallel');
  const namePrefix = String(options['name-prefix'] || buildDefaultPrefix()).trim();

  const requireUpdate = Boolean(options['require-update']);
  const skipUpdate = Boolean(options['skip-update']);
  const updateResult = await ensureMorphcloud({ skipUpdate, requireUpdate });

  const stateFile = resolveStateFile(options);
  const state = loadState(stateFile);

  const baseArgs = mode === 'build'
    ? buildBuildArgs(options, snapshot)
    : buildCloneArgs(options, snapshot);

  const tasks = Array.from({ length: count }, (_, index) => ({ index }));
  const results = [];

  await runWithConcurrency(tasks, parallel, async ({ index }) => {
    const instanceName = `${namePrefix}-${index + 1}`;
    const args = [...baseArgs, '--name', instanceName, ...passthrough];
    const record = await provisionOne({ mode, args, instanceName, index: index + 1, options, snapshot });
    results.push(record);
    if (record.status === 'success') {
      state.instances[record.instance.id] = record.instance;
      saveState(stateFile, state);
    }
    return record;
  });

  const successes = results.filter((item) => item.status === 'success').map((item) => item.instance);
  const failures = results.filter((item) => item.status !== 'success').map((item) => ({
    index: item.index,
    name: item.name,
    error: item.error,
  }));

  printJson({
    status: failures.length ? 'partial' : 'ok',
    mode,
    snapshot,
    requested: count,
    succeeded: successes.length,
    failed: failures.length,
    update: updateResult,
    stateFile,
    instances: successes,
    failures,
  });
}

async function handleList(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('list');
    return;
  }

  const stateFile = resolveStateFile(options);
  const state = loadState(stateFile);
  const instances = Object.values(state.instances).sort((a, b) => {
    const aTime = Date.parse(a.createdAt || '') || 0;
    const bTime = Date.parse(b.createdAt || '') || 0;
    return aTime - bTime;
  });

  printJson({
    stateFile,
    instances,
  });
}

async function handleStop(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('stop');
    return;
  }

  const targets = resolveTargets(options);
  if (targets.length === 0) {
    throw new Error('No matching instances found. Use the list command or adjust filters.');
  }

  await ensureMorphcloud({ skipUpdate: true, requireUpdate: false });

  const stateFile = resolveStateFile(options);
  const state = loadState(stateFile);

  const results = [];
  for (const target of targets) {
    const prefix = `[stop:${target.id}] `;
    const commandResult = await runCommand('morphcloud', ['instance', 'stop', target.id], {
      prefix,
    });
    const ok = commandResult.code === 0;
    results.push({
      id: target.id,
      name: target.name,
      status: ok ? 'stopped' : 'failed',
    });
    if (ok) {
      if (options.forget) {
        delete state.instances[target.id];
      } else {
        state.instances[target.id] = {
          ...target,
          stoppedAt: new Date().toISOString(),
        };
      }
    }
  }

  saveState(stateFile, state);
  printJson({
    status: 'ok',
    stateFile,
    results,
  });
}

async function handleSimeval(argvRest) {
  const { options, positional, passthrough } = parseArgs(argvRest);
  if (options.help) {
    printUsage('simeval');
    return;
  }

  const commandArgs = positional.concat(passthrough);
  if (commandArgs.length === 0) {
    throw new Error('Missing SimEval command. Add args after `simeval` or after `--`.');
  }

  const targets = resolveTargets(options);
  if (targets.length === 0) {
    throw new Error('No matching instances found for simeval dispatch.');
  }

  const simevalPath = path.resolve(__dirname, 'simeval_cli.js');
  const tokenOverride = options.token ? String(options.token) : null;

  for (const target of targets) {
    const apiUrl = resolveApiUrl(target);
    if (!apiUrl) {
      console.error(`[simeval] Skipping ${target.name || target.id}: missing API URL.`);
      continue;
    }
    console.log(`\n[simeval] ${target.name || target.id} (${target.id}) -> ${apiUrl}`);
    const args = ['--server', apiUrl];
    const token = tokenOverride || target.authToken || '';
    if (token) {
      args.push('--token', token);
    }
    await runCommand('node', [simevalPath, ...commandArgs, ...args], { inherit: true });
  }
}

async function handleValidate(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('validate');
    return;
  }

  const targets = resolveTargets(options);
  if (targets.length === 0) {
    throw new Error('No matching instances found for validation.');
  }

  const validatorPath = path.resolve(__dirname, 'morphcloud_validator.js');
  const tokenOverride = options.token ? String(options.token) : null;

  for (const target of targets) {
    const apiUrl = resolveApiUrl(target);
    if (!apiUrl) {
      console.error(`[validate] Skipping ${target.name || target.id}: missing API URL.`);
      continue;
    }
    console.log(`\n[validate] ${target.name || target.id} (${target.id}) -> ${apiUrl}`);
    const args = [validatorPath, '--url', apiUrl];
    const token = tokenOverride || target.authToken || '';
    if (token) {
      args.push('--token', token);
    }
    await runCommand('node', args, { inherit: true });
  }
}

async function handleUpdate(argvRest) {
  const { options } = parseArgs(argvRest);
  if (options.help) {
    printUsage('update');
    return;
  }

  const updateResult = await ensureMorphcloud({ skipUpdate: false, requireUpdate: true });
  printJson({
    status: 'ok',
    update: updateResult,
  });
}

function parseArgs(argvInput) {
  const options = {};
  const positional = [];
  const passthrough = [];

  for (let index = 0; index < argvInput.length; index += 1) {
    const arg = argvInput[index];
    if (arg === '--') {
      passthrough.push(...argvInput.slice(index + 1));
      break;
    }
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
    if (key === 'metadata' || key === 'id') {
      if (!options[key]) {
        options[key] = [];
      }
      options[key].push(next);
      index += 1;
      continue;
    }
    options[key] = next;
    index += 1;
  }

  return { options, positional, passthrough };
}

function resolveStateFile(options) {
  const candidate = options.state ?? process.env.SIMEVAL_MORPHCLOUD_STATE ?? path.join(os.homedir(), '.simeval', 'morphcloud.json');
  return path.resolve(process.cwd(), String(candidate));
}

function loadState(stateFile) {
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return normalizeState({});
    }
    throw error;
  }
}

function saveState(stateFile, state) {
  const normalized = normalizeState(state);
  normalized.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function normalizeState(state) {
  const instances =
    state && typeof state === 'object' && state.instances && typeof state.instances === 'object'
      ? state.instances
      : {};
  return {
    instances,
    updatedAt: state && typeof state === 'object' && typeof state.updatedAt === 'string' ? state.updatedAt : null,
  };
}

function resolveTargets(options) {
  const stateFile = resolveStateFile(options);
  const state = loadState(stateFile);
  const instances = Object.values(state.instances);

  if (options.all) {
    return instances;
  }

  const ids = collectIds(options);
  if (ids.length > 0) {
    return instances.filter((instance) => ids.includes(instance.id));
  }

  if (options.name) {
    const needle = String(options.name).toLowerCase();
    return instances.filter((instance) => (instance.name || '').toLowerCase().includes(needle));
  }

  return [];
}

function collectIds(options) {
  const ids = [];
  if (Array.isArray(options.id)) {
    ids.push(...options.id);
  }
  if (options.ids) {
    ids.push(...String(options.ids).split(',').map((item) => item.trim()).filter(Boolean));
  }
  return Array.from(new Set(ids.filter(Boolean)));
}

function buildDefaultPrefix() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `simeval-fleet-${stamp}`;
}

function normalizeMode(mode) {
  const normalized = String(mode).toLowerCase();
  if (normalized === 'build' || normalized === 'clone') {
    return normalized;
  }
  throw new Error('Invalid --mode. Expected build or clone.');
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Invalid --${label}: ${value}`);
  }
  return parsed;
}

function parseOptionalNumber(value, label) {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${label}: ${value}`);
  }
  return parsed;
}

function buildBuildArgs(options, snapshot) {
  const args = ['--snapshot', snapshot];
  if (options['service-name']) {
    args.push('--service-name', String(options['service-name']));
  }
  const port = parseOptionalNumber(options.port, 'port');
  if (port) {
    args.push('--port', String(port));
  }
  if (options['auth-token']) {
    args.push('--auth-token', String(options['auth-token']));
  }
  if (options['no-auth']) {
    args.push('--no-auth');
  }
  if (options['auth-mode']) {
    args.push('--auth-mode', String(options['auth-mode']));
  }
  const diskSize = options['disk-size'] ?? options['disk'];
  if (diskSize) {
    args.push('--disk-size', String(diskSize));
  }
  if (options['repo-url']) {
    args.push('--repo-url', String(options['repo-url']));
  }
  if (options['repo-branch']) {
    args.push('--repo-branch', String(options['repo-branch']));
  }
  if (options.host) {
    args.push('--host', String(options.host));
  }
  const rateWindow = options['rate-window'] ?? options['rate-window-ms'];
  if (rateWindow) {
    args.push('--rate-window', String(rateWindow));
  }
  if (options['rate-max']) {
    args.push('--rate-max', String(options['rate-max']));
  }
  if (options['swap-size']) {
    args.push('--swap-size', String(options['swap-size']));
  }
  if (options['skip-tests']) {
    args.push('--skip-tests');
  }
  if (options['no-expose']) {
    args.push('--no-expose');
  }
  if (options['keep-on-failure']) {
    args.push('--keep-on-failure');
  }
  if (options.metadata) {
    for (const meta of ensureArray(options.metadata)) {
      args.push('--metadata', String(meta));
    }
  }
  return args;
}

function buildCloneArgs(options, snapshot) {
  const args = ['--snapshot', snapshot, '--json'];
  if (options['service-name']) {
    args.push('--service-name', String(options['service-name']));
  }
  const port = parseOptionalNumber(options.port, 'port');
  if (port) {
    args.push('--port', String(port));
  }
  if (options['auth-mode']) {
    args.push('--auth-mode', String(options['auth-mode']));
  }
  const diskSize = options['disk-size'] ?? options['disk'];
  if (diskSize) {
    args.push('--disk-size', String(diskSize));
  }
  const timeout = parseOptionalNumber(options.timeout, 'timeout');
  if (timeout) {
    args.push('--timeout', String(timeout));
  }
  const poll = parseOptionalNumber(options['poll-interval'], 'poll-interval');
  if (poll) {
    args.push('--poll-interval', String(poll));
  }
  if (options.metadata) {
    for (const meta of ensureArray(options.metadata)) {
      args.push('--metadata', String(meta));
    }
  }
  return args;
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

async function provisionOne({ mode, args, instanceName, index, options, snapshot }) {
  const prefix = `[${mode}:${index}] `;
  const startTime = new Date().toISOString();
  const commandPath = mode === 'build'
    ? path.resolve(__dirname, 'morphcloud_build_instance.sh')
    : path.resolve(__dirname, 'morphcloud_clone_snapshot.js');

  const commandArgs = mode === 'build' ? args : [commandPath, ...args];
  const command = mode === 'build' ? commandPath : 'node';

  const result = await runCommand(command, commandArgs, { prefix });
  if (result.code !== 0) {
    return {
      status: 'failed',
      index,
      name: instanceName,
      error: `Provisioning command failed with code ${result.code}`,
    };
  }

  try {
    const parsed = mode === 'build'
      ? parseBuildOutput(result.stdout + result.stderr)
      : parseCloneOutput(result.stdout);

    const instance = buildInstanceRecord({
      name: instanceName,
      snapshot,
      mode,
      options,
      parsed,
      startedAt: startTime,
    });

    return { status: 'success', index, name: instanceName, instance };
  } catch (error) {
    return {
      status: 'failed',
      index,
      name: instanceName,
      error: error.message,
    };
  }
}

function parseBuildOutput(output) {
  const instanceId = matchValue(output, 'Instance ID');
  if (!instanceId) {
    throw new Error('Unable to parse instance ID from build output.');
  }

  const internalIp = matchValue(output, 'Internal IP');
  const service = matchValue(output, 'Service');
  const portValue = matchValue(output, 'Port');
  const authToken = matchValue(output, 'Auth token');
  const publicUrl = matchValue(output, 'Public URL');

  return {
    instanceId,
    internalIp: internalIp || null,
    serviceName: service ? service.replace(/\.service$/, '') : null,
    port: portValue ? Number(portValue) : null,
    authToken: normalizeAuthToken(authToken),
    publicUrl: normalizeUrl(publicUrl),
  };
}

function parseCloneOutput(output) {
  let parsed;
  try {
    parsed = JSON.parse(output.trim());
  } catch (error) {
    throw new Error(`Unable to parse clone output JSON: ${error.message}`);
  }
  if (!parsed.instanceId) {
    throw new Error('Clone output missing instanceId.');
  }
  return {
    instanceId: parsed.instanceId,
    internalIp: parsed.internalIp ?? null,
    serviceName: parsed.serviceName ?? null,
    port: parsed.port ?? null,
    authToken: null,
    publicUrl: normalizeUrl(parsed.publicUrl),
  };
}

function matchValue(output, label) {
  const pattern = new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, 'm');
  const match = output.match(pattern);
  return match ? match[1].trim() : '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeAuthToken(token) {
  if (!token) {
    return null;
  }
  const trimmed = String(token).trim();
  if (!trimmed || trimmed === '<disabled>' || trimmed === '<none>') {
    return null;
  }
  return trimmed;
}

function normalizeUrl(url) {
  if (!url) {
    return null;
  }
  const trimmed = String(url).trim();
  if (!trimmed || trimmed === '<not exposed>') {
    return null;
  }
  return trimmed.replace(/\/+$/, '');
}

function buildInstanceRecord({ name, snapshot, mode, options, parsed, startedAt }) {
  const authToken = options['auth-token'] ? String(options['auth-token']) : parsed.authToken;
  const publicUrl = parsed.publicUrl;
  const apiUrl = publicUrl ? `${publicUrl}/api` : parsed.internalIp && parsed.port ? `http://${parsed.internalIp}:${parsed.port}/api` : null;

  return {
    id: parsed.instanceId,
    name,
    mode,
    snapshot,
    serviceName: parsed.serviceName,
    port: parsed.port,
    internalIp: parsed.internalIp,
    publicUrl,
    apiUrl,
    authToken: authToken || null,
    authMode: options['auth-mode'] ?? null,
    createdAt: startedAt,
    metadata: ensureArray(options.metadata),
  };
}

function resolveApiUrl(instance) {
  if (instance.apiUrl) {
    return instance.apiUrl;
  }
  if (instance.publicUrl) {
    return `${String(instance.publicUrl).replace(/\/+$/, '')}/api`;
  }
  if (instance.internalIp && instance.port) {
    return `http://${instance.internalIp}:${instance.port}/api`;
  }
  return null;
}

async function ensureMorphcloud({ skipUpdate, requireUpdate }) {
  ensureCommand('morphcloud');
  if (!process.env.MORPH_API_KEY) {
    throw new Error('MORPH_API_KEY is not set.');
  }

  if (skipUpdate) {
    return { status: 'skipped' };
  }

  const updateCommands = [
    { cmd: 'morphcloud', args: ['update'] },
    { cmd: 'morphcloud', args: ['self-update'] },
  ];

  for (const attempt of updateCommands) {
    const result = await runCommand(attempt.cmd, attempt.args, { prefix: '[update] ' });
    if (result.code === 0) {
      return { status: 'updated', command: `${attempt.cmd} ${attempt.args.join(' ')}` };
    }
    if (!isUnknownCommand(result.stdout + result.stderr)) {
      if (requireUpdate) {
        throw new Error(`Morphcloud update failed: ${result.stderr || result.stdout}`);
      }
      return { status: 'failed', command: `${attempt.cmd} ${attempt.args.join(' ')}` };
    }
  }

  if (requireUpdate) {
    throw new Error('Morphcloud update command not available.');
  }

  return { status: 'unsupported' };
}

function isUnknownCommand(output) {
  const text = String(output).toLowerCase();
  return text.includes('unknown command') || text.includes('unrecognized') || text.includes('invalid choice');
}

function ensureCommand(name) {
  const result = spawnSync('which', [name], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error(`${name} not found in PATH.`);
  }
}

async function runWithConcurrency(items, limit, worker) {
  let active = 0;
  let index = 0;

  return new Promise((resolve) => {
    const next = () => {
      if (index >= items.length && active === 0) {
        resolve();
        return;
      }

      while (active < limit && index < items.length) {
        const item = items[index++];
        active += 1;
        Promise.resolve(worker(item))
          .catch(() => undefined)
          .finally(() => {
            active -= 1;
            next();
          });
      }
    };

    next();
  });
}

function runCommand(command, args, { prefix, inherit } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    if (inherit) {
      child.on('error', reject);
      child.on('close', (code) => resolve({ code: code ?? 0, stdout: '', stderr: '' }));
      return;
    }

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

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function printUsage(message) {
  const sections = new Set(['provision', 'list', 'stop', 'simeval', 'validate', 'update']);
  const section = sections.has(message) ? message : null;
  if (message && !section) {
    console.error(message);
  }

  console.log(`\nUsage: node tools/morphcloud_distributor.js <command> [options]\n`);
  console.log('Commands:');
  console.log('  provision|create          Provision Morphcloud instances and ship SimEval');
  console.log('  list                      List tracked instances');
  console.log('  stop                      Stop instances');
  console.log('  simeval                   Run simeval_cli against instances');
  console.log('  validate                  Run morphcloud_validator against instances');
  console.log('  update                    Update morphcloud CLI');

  if (!message) {
    console.log('\nExamples:');
    console.log('  node tools/morphcloud_distributor.js provision --snapshot snapshot_abc --count 3');
    console.log('  node tools/morphcloud_distributor.js provision --snapshot snapshot_abc --mode clone --count 2');
    console.log('  node tools/morphcloud_distributor.js list');
    console.log('  node tools/morphcloud_distributor.js stop --all');
    console.log('  node tools/morphcloud_distributor.js simeval --all -- status');
    console.log('  node tools/morphcloud_distributor.js validate --name fleet');
    console.log('');
  }

  if (!section) {
    return;
  }

  if (section === 'provision') {
    console.log('Provision options:');
    console.log('  --snapshot ID             Snapshot ID to boot (required)');
    console.log('  --mode MODE               build (default) or clone');
    console.log('  --count N                 Number of instances (default: 1)');
    console.log('  --parallel N              Provision concurrently (default: 1)');
    console.log('  --name-prefix NAME        Prefix for instance names');
    console.log('  --service-name NAME       Service name for expose-http');
    console.log('  --port PORT               SimEval port inside VM');
    console.log('  --auth-token TOKEN        SimEval auth token (build mode only, stored for simeval dispatch)');
    console.log('  --no-auth                 Disable SimEval auth (build mode)');
    console.log('  --auth-mode MODE          expose-http auth mode');
    console.log('  --metadata key=value      Metadata entries (repeatable)');
    console.log('  --disk-size MB            Disk size override');
    console.log('  --skip-update             Skip morphcloud update');
    console.log('  --require-update          Fail if morphcloud update is unavailable');
    console.log('  --state PATH              State file location');
    console.log('  --                        Pass remaining args to the underlying provision script');
    console.log('');
    return;
  }

  if (section === 'list') {
    console.log('List options:');
    console.log('  --state PATH              State file location');
    console.log('');
    return;
  }

  if (section === 'stop') {
    console.log('Stop options:');
    console.log('  --all                     Stop all tracked instances');
    console.log('  --id ID                   Stop a specific instance (repeatable)');
    console.log('  --ids ID1,ID2             Stop a comma-delimited list of IDs');
    console.log('  --name SUBSTRING          Stop instances matching name substring');
    console.log('  --forget                  Remove stopped instances from state');
    console.log('  --state PATH              State file location');
    console.log('');
    return;
  }

  if (section === 'simeval') {
    console.log('Simeval options:');
    console.log('  --all                     Target all instances');
    console.log('  --id ID                   Target a specific instance (repeatable)');
    console.log('  --ids ID1,ID2             Target a comma-delimited list of IDs');
    console.log('  --name SUBSTRING          Target instances matching name substring');
    console.log('  --token TOKEN             Override auth token for simeval_cli');
    console.log('  --state PATH              State file location');
    console.log('  --                        Pass remaining args to simeval_cli');
    console.log('');
    return;
  }

  if (section === 'validate') {
    console.log('Validate options:');
    console.log('  --all                     Target all instances');
    console.log('  --id ID                   Target a specific instance (repeatable)');
    console.log('  --ids ID1,ID2             Target a comma-delimited list of IDs');
    console.log('  --name SUBSTRING          Target instances matching name substring');
    console.log('  --token TOKEN             Override auth token for validator');
    console.log('  --state PATH              State file location');
    console.log('');
    return;
  }

  if (section === 'update') {
    console.log('Update options:');
    console.log('  --require-update          Fail if update fails');
    console.log('');
  }
}
