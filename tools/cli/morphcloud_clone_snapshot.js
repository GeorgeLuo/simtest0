#!/usr/bin/env node
'use strict';

/**
 * Clone a ready-to-run SimEval snapshot on Morphcloud.
 *
 * Given a snapshot ID, this CLI boots a fresh instance, waits for it to reach
 * the `ready` state, exposes the SimEval port via `morphcloud instance
 * expose-http`, and prints the resulting public URL.
 *
 * Usage:
 *   node tools/cli/morphcloud_clone_snapshot.js --snapshot SNAPSHOT_ID [options]
 *
 * Options:
 *   --name NAME              Friendly instance metadata name (default: simeval-clone-<timestamp>)
 *   --service-name NAME      Service name for expose-http (default: simeval)
 *   --port PORT              Port where SimEval listens inside the VM (default: 3000)
 *   --auth-mode MODE         expose-http auth mode (none|api_key, default: none)
 *   --metadata key=value     Additional metadata entries (repeatable)
 *   --disk-size MB           Optional disk size override for morphcloud boot
 *   --timeout SECONDS        Max time to wait for ready status (default: 300)
 *   --poll-interval SECONDS  Poll interval while waiting for ready (default: 5)
 *   --json                   Emit final summary as JSON (progress logs stay on stderr)
 *   -h, --help               Show this help text
 *
 * Environment:
 *   MORPH_API_KEY            Required by the morphcloud CLI.
 */

const { spawn, spawnSync } = require('child_process');

const DEFAULT_SERVICE_NAME = 'simeval';
const DEFAULT_PORT = 3000;
const DEFAULT_AUTH_MODE = 'none';
const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_POLL_SECONDS = 5;

function log(message) {
  process.stderr.write(`[clone] ${message}\n`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    printUsage();
    process.exit(1);
  }
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const snapshotId = (args.snapshot || '').trim();
  if (!snapshotId) {
    console.error('Error: --snapshot is required.');
    printUsage();
    process.exit(1);
  }

  ensureCommand('morphcloud');

  if (!process.env.MORPH_API_KEY) {
    console.error('Error: MORPH_API_KEY is not set.');
    process.exit(1);
  }

  const instanceName =
    args.name || `simeval-clone-${new Date().toISOString().replace(/[-:.TZ]/g, '')}`;
  const serviceName = args.serviceName || DEFAULT_SERVICE_NAME;
  const port = args.port ?? DEFAULT_PORT;
  const authMode = args.authMode || DEFAULT_AUTH_MODE;
  const timeoutMs = (args.timeout ?? DEFAULT_TIMEOUT_SECONDS) * 1000;
  const pollMs = (args.pollInterval ?? DEFAULT_POLL_SECONDS) * 1000;
  const metadataArgs = [`name=${instanceName}`, ...(args.metadata || [])];

  log(`Booting snapshot ${snapshotId} as ${instanceName}...`);
  const bootArgs = ['instance', 'boot', snapshotId];
  for (const meta of metadataArgs) {
    bootArgs.push('--metadata', meta);
  }
  if (args.diskSize) {
    bootArgs.push('--disk-size', String(args.diskSize));
  }
  const bootResult = await runMorphcloud(bootArgs);
  const instanceId = parseInstanceId(bootResult);
  if (!instanceId) {
    console.error(bootResult.trim());
    throw new Error('Unable to determine instance ID from morphcloud output.');
  }
  log(`Instance ID: ${instanceId}`);

  const instanceInfo = await waitForReady(instanceId, { timeoutMs, pollMs });
  const internalIp = instanceInfo?.networking?.internal_ip ?? '<unknown>';
  log(`Instance ready (internal IP ${internalIp}).`);

  log(`Exposing port ${port} via service "${serviceName}" (auth: ${authMode})...`);
  const exposeArgs = ['instance', 'expose-http', '--auth-mode', authMode, instanceId, serviceName, String(port)];
  const exposeOutput = await runMorphcloud(exposeArgs);
  const publicUrl = parseExposeUrl(exposeOutput);
  if (!publicUrl) {
    console.error(exposeOutput.trim());
    throw new Error('Unable to parse exposed URL.');
  }
  log(`Public URL: ${publicUrl}`);

  const summary = {
    instanceId,
    internalIp,
    publicUrl,
    port,
    serviceName,
  };

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('\nSimEval clone ready:');
    console.log(`  Instance ID: ${instanceId}`);
    console.log(`  Internal IP: ${internalIp}`);
    console.log(`  Public URL: ${publicUrl}`);
  }
}

function parseArgs(argv) {
  const result = {
    metadata: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    if (token === '--help' || token === '-h') {
      result.help = true;
      continue;
    }

    if (token === '--json') {
      result.json = true;
      continue;
    }

    const key = token.slice(2);
    if (key === 'metadata') {
      const value = argv[++i];
      if (!value) {
        throw new Error('--metadata requires a value (key=value).');
      }
      result.metadata.push(value);
      continue;
    }

    const value = argv[++i];
    if (value === undefined) {
      throw new Error(`Option ${token} requires a value.`);
    }

    switch (key) {
      case 'snapshot':
        result.snapshot = value;
        break;
      case 'name':
        result.name = value;
        break;
      case 'service-name':
        result.serviceName = value;
        break;
      case 'port':
        result.port = parseInt(value, 10);
        if (!Number.isFinite(result.port) || result.port <= 0) {
          throw new Error('--port must be a positive integer.');
        }
        break;
      case 'auth-mode':
        result.authMode = value;
        break;
      case 'disk-size':
        result.diskSize = value;
        break;
      case 'timeout':
        result.timeout = Number(value);
        if (!Number.isFinite(result.timeout) || result.timeout <= 0) {
          throw new Error('--timeout must be a positive number of seconds.');
        }
        break;
      case 'poll-interval':
        result.pollInterval = Number(value);
        if (!Number.isFinite(result.pollInterval) || result.pollInterval <= 0) {
          throw new Error('--poll-interval must be a positive number of seconds.');
        }
        break;
      default:
        throw new Error(`Unknown option: ${token}`);
    }
  }

  return result;
}

function printUsage() {
  console.log(`
Usage: node tools/cli/morphcloud_clone_snapshot.js --snapshot SNAPSHOT_ID [options]

Options:
  --name NAME              Friendly instance metadata name (default: simeval-clone-<timestamp>)
  --service-name NAME      Service name for expose-http (default: simeval)
  --port PORT              Port where SimEval listens inside the VM (default: 3000)
  --auth-mode MODE         expose-http auth mode (none|api_key, default: none)
  --metadata key=value     Additional metadata entries (repeatable)
  --disk-size MB           Optional disk size override for morphcloud boot
  --timeout SECONDS        Max time to wait for ready status (default: 300)
  --poll-interval SECONDS  Poll interval while waiting for ready (default: 5)
  --json                   Emit the final summary as JSON
  -h, --help               Show this message

Environment variables:
  MORPH_API_KEY            Required by the morphcloud CLI.
`);
}

function ensureCommand(name) {
  const check = spawnSync('which', [name], { stdio: 'ignore' });
  if (check.status !== 0) {
    console.error(`Error: ${name} not found in PATH.`);
    process.exit(1);
  }
}

async function runMorphcloud(args) {
  const captured = await runCommand('morphcloud', args);
  return captured.trim();
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`${cmd} ${args.join(' ')} exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      } else {
        resolve(stdout || stderr);
      }
    });
  });
}

async function waitForReady(instanceId, { timeoutMs, pollMs }) {
  const start = Date.now();
  while (true) {
    const info = await getInstanceInfo(instanceId);
    if (info?.status === 'ready') {
      return info;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for instance ${instanceId} to reach ready status.`);
    }
    await sleep(pollMs);
  }
}

async function getInstanceInfo(instanceId) {
  const output = await runMorphcloud(['instance', 'get', instanceId]);
  try {
    return JSON.parse(output);
  } catch (err) {
    throw new Error(`Unable to parse JSON from morphcloud instance get: ${err.message}`);
  }
}

function parseInstanceId(output) {
  const match = output.match(/Instance booted:\s+([^\s]+)/);
  return match ? match[1] : null;
}

function parseExposeUrl(output) {
  const match = output.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  log(`Error: ${err.message}`);
  if (err.stdout) {
    process.stderr.write(`${err.stdout}\n`);
  }
  if (err.stderr) {
    process.stderr.write(`${err.stderr}\n`);
  }
  process.exit(1);
});
