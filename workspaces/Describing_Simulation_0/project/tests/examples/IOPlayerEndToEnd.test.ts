import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import { Bus } from '../../src/ecs/messaging/Bus.js';
import {
  IOPlayer,
  type InboundMessage,
  type OutboundMessage,
} from '../../src/ecs/messaging/IOPlayer.js';

const testFilePath = fileURLToPath(import.meta.url);
const testDirectory = path.dirname(testFilePath);
const repositoryRoot = path.resolve(testDirectory, '..', '..', '..', '..', '..');
const outboundLogDirectory = path.join(repositoryRoot, 'verifications', 'ioplayer');

const formatTimestampForFilename = (isoTimestamp: string) =>
  isoTimestamp.replace(/:/g, '-').replace('T', '_').replace(/\..*/, '');

describe('IOPlayer end-to-end example', () => {
  let logTimestampIso: string;

  beforeEach(() => {
    logTimestampIso = new Date().toISOString();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs frames and acknowledgements when processing start/stop messages', async () => {
    await mkdir(outboundLogDirectory, { recursive: true });

    const logFilePath = path.join(
      outboundLogDirectory,
      `${formatTimestampForFilename(logTimestampIso)}-ioplayer-outbound-${randomUUID()}.log`,
    );

    const logStream = createWriteStream(logFilePath, { flags: 'w' });
    let logStreamClosePromise: Promise<void> | null = null;
    const ensureLogStreamClosed = () => {
      if (!logStreamClosePromise) {
        logStreamClosePromise = new Promise<void>((resolve, reject) => {
          logStream.once('finish', resolve);
          logStream.once('error', reject);
          logStream.end();
        });
      }

      return logStreamClosePromise;
    };

    try {
      logStream.write('IOPlayer outbound stream log\n');
      logStream.write(`Created at ${logTimestampIso}\n\n`);

      const componentManager = new ComponentManager();
      const entityManager = new EntityManager(componentManager);
      const systemManager = new SystemManager();

      const inboundBus = new Bus<InboundMessage>();
      const outboundBus = new Bus<OutboundMessage>();

      const player = new IOPlayer(
        entityManager,
        componentManager,
        systemManager,
        inboundBus,
        outboundBus,
        {
          tickIntervalMs: 1_000,
          deltaTime: 1,
        },
      );

      const loggedMessages: OutboundMessage[] = [];
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outboundBus.subscribe((message) => {
        const timestamp = new Date().toISOString();
        const serialized = JSON.stringify(message, null, 2);
        logStream.write(`[${timestamp}] ${message.type.toUpperCase()}\n${serialized}\n\n`);
        console.log('Outbound message:', message.type, message);
        loggedMessages.push(message);
      });

      await inboundBus.publish({ id: 'start-message', type: 'start', payload: {} });

      await vi.advanceTimersByTimeAsync(5_000);

      await inboundBus.publish({ id: 'stop-message', type: 'stop', payload: {} });

      await vi.runAllTimersAsync();

      player.dispose();

      await ensureLogStreamClosed();

      const acknowledgementMessages = loggedMessages.filter(
        (message): message is Extract<OutboundMessage, { type: 'acknowledgement' }> =>
          message.type === 'acknowledgement',
      );
      const frameMessages = loggedMessages.filter(
        (message): message is Extract<OutboundMessage, { type: 'frame' }> =>
          message.type === 'frame',
      );

      const acknowledgementIds = acknowledgementMessages.map(
        (message) => message.payload.messageId,
      );

      expect(frameMessages.length).toBeGreaterThan(0);
      expect(acknowledgementMessages).toHaveLength(2);
      expect(acknowledgementIds).toEqual(
        expect.arrayContaining(['start-message', 'stop-message']),
      );
      expect(acknowledgementMessages.every((message) => message.payload.status === 'success')).toBe(
        true,
      );

      const loggedTypes = consoleSpy.mock.calls
        .filter((call) => call[0] === 'Outbound message:')
        .map((call) => call[1]);

      expect(loggedTypes).toContain('frame');
      expect(loggedTypes.filter((type) => type === 'acknowledgement').length).toBeGreaterThanOrEqual(2);

      const outboundStreamLog = await readFile(logFilePath, 'utf-8');
      expect(outboundStreamLog).toContain('"type": "frame"');
      expect(outboundStreamLog).toContain('"type": "acknowledgement"');
    } finally {
      await ensureLogStreamClosed();
    }
  });
});
