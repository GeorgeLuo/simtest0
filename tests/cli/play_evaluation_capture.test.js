'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');
const { WebSocketServer } = require('ws');

const CLI_PATH = path.resolve(__dirname, '../../tools/cli/simeval_cli.js');
const PNG_BYTES = Buffer.from('89504e470d0a1a0a', 'hex');

function runCli(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      cwd: options.cwd,
      env: { ...process.env, HOME: options.home },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('play-evaluation-capture requests and persists one atomic capture', async (t) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'simeval-capture-'));
  t.after(() => fs.rmSync(tempDirectory, { recursive: true, force: true }));

  const received = [];
  const server = new WebSocketServer({ port: 0 });
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      received.push(message);
      if (message.type === 'register') {
        socket.send(JSON.stringify({ type: 'ack' }));
        return;
      }
      if (message.type === 'play_game_query') {
        socket.send(JSON.stringify({
          type: 'play_game_query_result',
          request_id: message.request_id,
          payload: {
            queryId: 'atomic-evaluation-capture',
            result: {
              contractVersion: 1,
              captureId: 'chase:evaluation:run-7:chaser:42',
              actorId: 'chaser',
              frameIdentity: {
                gameId: 'chase',
                simulationEpoch: 'run-7',
                frameIndex: 42,
              },
              playback: { advanced: false },
              sensor: {
                image: {
                  contentType: 'image/png',
                  rendererId: 'chase-front-view-v1',
                  width: 320,
                  height: 240,
                  dataUrl: `data:image/png;base64,${PNG_BYTES.toString('base64')}`,
                },
              },
              evaluator: {
                classification: 'non-sensor',
                shadow: {
                  kind: 'visible-observation-summary',
                  visibleActorCount: 1,
                  visibleWallCount: 3,
                  visibleAreaCellCount: 8,
                  observationCount: 12,
                },
              },
            },
          },
        }));
      }
    });
  });

  const address = server.address();
  const outputDirectory = path.join(tempDirectory, 'captures');
  const result = await runCli([
    'ui',
    'play-evaluation-capture',
    '--actor',
    'chaser',
    '--width',
    '320',
    '--height',
    '240',
    '--out-dir',
    outputDirectory,
    '--ui',
    `ws://127.0.0.1:${address.port}`,
  ], { cwd: tempDirectory, home: tempDirectory });

  assert.equal(result.code, 0, result.stderr);
  const request = received.find((message) => message.type === 'play_game_query');
  assert.deepEqual(request.payload, {
    actorId: 'chaser',
    width: 320,
    height: 240,
  });
  assert.equal(request.queryId, 'atomic-evaluation-capture');

  const output = JSON.parse(result.stdout);
  const metadata = JSON.parse(fs.readFileSync(output.metadataPath, 'utf8'));
  assert.deepEqual(fs.readFileSync(output.imagePath), PNG_BYTES);
  assert.deepEqual(output.frameIdentity, {
    gameId: 'chase',
    simulationEpoch: 'run-7',
    frameIndex: 42,
  });
  assert.equal(metadata.sensor.image.dataUrl, undefined);
  assert.equal(metadata.sensor.image.file, path.basename(output.imagePath));
  assert.equal(metadata.evaluator.classification, 'non-sensor');
  assert.deepEqual(metadata.files, {
    metadata: path.basename(output.metadataPath),
    image: path.basename(output.imagePath),
  });
});
