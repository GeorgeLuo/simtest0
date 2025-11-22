#!/usr/bin/env node

/*
 * Component Stream Filter
 *
 * Opens an SSE stream from a SimEval server and emits only the payloads for a
 * specific component across all entities. Each matching payload is written to
 * stdout as either structured text or JSON (see --format).
 *
 * Example:
 *   node tools/component_stream_filter.js \
 *     --server http://127.0.0.1:3123/api \
 *     --stream /simulation/stream \
 *     --component temperature \
 *     --format json
 */

const { TextDecoder } = require('util');

if (typeof fetch !== 'function') {
  console.error('This tool requires Node.js 18+ (fetch API is unavailable).');
  process.exit(1);
}

const cliArgs = parseArgs(process.argv.slice(2));

if (cliArgs.help) {
  printUsage();
  process.exit(0);
}

const server = (cliArgs.server ?? process.env.SIMEVAL_SERVER_URL ?? '').trim();
const streamPathInput = (cliArgs.stream ?? process.env.SIMEVAL_STREAM_PATH ?? '').trim();
const componentId = (cliArgs.component ?? process.env.SIMEVAL_COMPONENT_ID ?? '').trim();
const entityFilter = (cliArgs.entity ?? process.env.SIMEVAL_ENTITY_ID ?? '').trim();
const format = (cliArgs.format ?? process.env.SIMEVAL_OUTPUT_FORMAT ?? 'text').trim().toLowerCase();
const rawToken = (cliArgs.token ?? process.env.SIMEVAL_AUTH_TOKEN ?? process.env.SIMEVAL_API_TOKEN ?? '').trim();

if (!server || !streamPathInput || !componentId) {
  printUsage('Missing required arguments.');
  process.exit(1);
}

if (format !== 'text' && format !== 'json') {
  console.error('Invalid --format value. Expected "text" or "json".');
  process.exit(1);
}

const normalizedServer = server.replace(/\/+$/, '');
const normalizedStreamPath = streamPathInput.startsWith('/') ? streamPathInput : `/${streamPathInput}`;
const targetUrl = `${normalizedServer}${normalizedStreamPath}`;
const authHeader = rawToken
  ? rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`
  : null;

const headers = {
  Accept: 'text/event-stream',
  'User-Agent': 'simtest0-component-filter/1.0',
};
if (authHeader) {
  headers.Authorization = authHeader;
}

const abortController = new AbortController();

process.once('SIGINT', () => {
  console.log('\n[filter] Caught SIGINT. Closing stream...');
  abortController.abort();
});

process.once('SIGTERM', () => {
  console.log('\n[filter] Caught SIGTERM. Closing stream...');
  abortController.abort();
});

async function main() {
  console.log(`[filter] Target server: ${normalizedServer}`);
  console.log(`[filter] SSE path: ${normalizedStreamPath}`);
  if (entityFilter) {
    console.log(`[filter] Restricting to entity: ${entityFilter}`);
  }
  console.log(`[filter] Component: ${componentId}`);
  console.log(`[filter] Output format: ${format}`);

  await streamComponentValues();
}

async function streamComponentValues() {
  const response = await fetch(targetUrl, {
    headers,
    signal: abortController.signal,
  });

  if (!response.ok) {
    throw new Error(`SSE request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('SSE response missing readable body.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        buffer = processBuffer(buffer);
        console.log('[filter] Stream closed by server.');
        break;
      }

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        buffer = processBuffer(buffer);
      }
    }
  } catch (error) {
    if (abortController.signal.aborted && error.name === 'AbortError') {
      console.log('[filter] Stream aborted.');
      return;
    }
    throw error;
  } finally {
    abortController.abort();
    await reader.cancel().catch(() => undefined);
  }
}

function processBuffer(text) {
  let working = text;
  let delimiterIndex;
  while ((delimiterIndex = working.indexOf('\n\n')) >= 0) {
    const chunk = working.slice(0, delimiterIndex).trim();
    working = working.slice(delimiterIndex + 2);
    if (!chunk) {
      continue;
    }
    const payload = extractEventData(chunk);
    if (payload) {
      handleEvent(payload);
    }
  }
  return working;
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

  const payloadText = dataLines.join('\n');
  try {
    return JSON.parse(payloadText);
  } catch {
    console.warn('[filter] Skipping non-JSON SSE payload.');
    return null;
  }
}

function handleEvent(message) {
  const records = extractComponentRecords(message);
  if (records.length === 0) {
    return;
  }

  for (const record of records) {
    if (format === 'json') {
      console.log(JSON.stringify(record));
    } else {
      const rendered = renderValue(record.value);
      console.log(`[tick ${record.tick}] [entity ${record.entityId}] ${componentId}: ${rendered}`);
    }
  }
}

function extractComponentRecords(frame) {
  if (!frame || typeof frame !== 'object') {
    return [];
  }

  const { tick, entities } = frame;
  if (!Number.isFinite(tick) || !entities || typeof entities !== 'object') {
    return [];
  }

  const matches = [];
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
      tick,
      entityId,
      value: components[componentId],
    });
  }

  return matches;
}

function renderValue(value) {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    if (key === 'help') {
      result.help = true;
      continue;
    }
    const value = argv[i + 1];
    if (typeof value === 'undefined' || value.startsWith('--')) {
      result[key] = 'true';
      continue;
    }
    result[key] = value;
    i += 1;
  }
  return result;
}

function printUsage(errorMessage) {
  if (errorMessage) {
    console.error(`[filter] ${errorMessage}`);
  }
  console.log('Usage:');
  console.log('  node tools/component_stream_filter.js --server <url> --stream <path> --component <id> [options]\n');
  console.log('Required arguments:');
  console.log('  --server     Base server URL (e.g., http://127.0.0.1:3123/api)');
  console.log('  --stream     Stream path (e.g., /simulation/stream or /evaluation/stream)');
  console.log('  --component  Component identifier to filter (e.g., temperature)');
  console.log('\nOptional arguments:');
  console.log('  --entity     Restrict results to a specific entity id');
  console.log('  --format     Output format: text (default) or json');
  console.log('  --token      Authorization token (defaults to SIMEVAL_AUTH_TOKEN env vars)');
  console.log('  --help       Show this message and exit');
}

main().catch((error) => {
  if (abortController.signal.aborted && error.name === 'AbortError') {
    return;
  }
  console.error(`[filter] ${error.message ?? error}`);
  process.exit(1);
});
