import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { timeComponentType } from '../../src/ecs/components/implementations/TimeComponent.js';
import {
  foodResourceComponentType,
  type FoodResourceComponent,
} from '../../src/ecs/components/implementations/plugins/FoodResourceComponent.js';
import {
  populationComponentType,
  type PopulationComponent,
} from '../../src/ecs/components/implementations/plugins/PopulationComponent.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { SystemManager } from '../../src/ecs/systems/SystemManager.js';
import { TimeSystem } from '../../src/ecs/systems/implementations/TimeSystem.js';
import { FoodDecaySystem } from '../../src/ecs/systems/implementations/plugins/FoodDecaySystem.js';
import { PopulationResponseSystem } from '../../src/ecs/systems/implementations/plugins/PopulationResponseSystem.js';
import { Bus } from '../../src/ecs/messaging/Bus.js';
import {
  IOPlayer,
  type InboundMessage,
  type OutboundMessage,
} from '../../src/ecs/messaging/IOPlayer.js';
import type { SnapshotEntity } from '../../src/ecs/Player.js';

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

      const colonyEntityId = 1;

      componentManager.registerType(timeComponentType);
      componentManager.registerType(foodResourceComponentType);
      componentManager.registerType(populationComponentType);

      const timeSystem = new TimeSystem(componentManager, colonyEntityId);
      const foodDecaySystem = new FoodDecaySystem(componentManager);
      const populationResponseSystem = new PopulationResponseSystem(componentManager);

      systemManager.register(timeSystem);
      systemManager.register(foodDecaySystem);
      systemManager.register(populationResponseSystem);

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

      const injectEntityMessage: InboundMessage = {
        id: 'inject-colony',
        type: 'inject-entity',
        payload: {
          id: colonyEntityId,
          components: [
            {
              typeId: foodResourceComponentType.id,
              values: {
                currentFood: 100,
                decayPerTick: 10,
                minimumFood: 0,
              },
            },
            {
              typeId: populationComponentType.id,
              values: {
                currentPopulation: 20,
                perCapitaFoodNeed: 4,
                starvationRate: 0.5,
                minimumPopulation: 1,
              },
            },
          ],
        },
      };

      await inboundBus.publish(injectEntityMessage);

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
      expect(acknowledgementMessages).toHaveLength(3);
      expect(acknowledgementIds).toEqual(
        expect.arrayContaining(['start-message', 'inject-colony', 'stop-message']),
      );
      expect(acknowledgementMessages.every((message) => message.payload.status === 'success')).toBe(
        true,
      );

      const loggedTypes = consoleSpy.mock.calls
        .filter((call) => call[0] === 'Outbound message:')
        .map((call) => call[1]);

      expect(loggedTypes).toContain('frame');
      expect(loggedTypes.filter((type) => type === 'acknowledgement').length).toBeGreaterThanOrEqual(3);

      const colonySnapshots = frameMessages
        .map((message) =>
          message.payload.entities.find((entity) => entity.id === colonyEntityId),
        )
        .filter((entity): entity is SnapshotEntity => Boolean(entity));

      expect(colonySnapshots.length).toBeGreaterThan(0);

      const foodReadings = colonySnapshots
        .map(
          (snapshot) =>
            snapshot.components[foodResourceComponentType.id] as
              | FoodResourceComponent
              | undefined,
        )
        .filter(
          (component): component is FoodResourceComponent => component !== undefined,
        );

      const populationReadings = colonySnapshots
        .map(
          (snapshot) =>
            snapshot.components[populationComponentType.id] as
              | PopulationComponent
              | undefined,
        )
        .filter(
          (component): component is PopulationComponent => component !== undefined,
        );

      expect(foodReadings.length).toBeGreaterThan(0);
      expect(populationReadings.length).toBeGreaterThan(0);

      const firstFood = foodReadings[0]?.currentFood ?? 0;
      const lastFood = foodReadings.at(-1)?.currentFood ?? 0;
      expect(lastFood).toBeLessThan(firstFood);

      const firstPopulation = populationReadings[0]?.currentPopulation ?? 0;
      const lastPopulation = populationReadings.at(-1)?.currentPopulation ?? 0;
      expect(lastPopulation).toBeLessThan(firstPopulation);

      const outboundStreamLog = await readFile(logFilePath, 'utf-8');
      expect(outboundStreamLog).toContain('"type": "frame"');
      expect(outboundStreamLog).toContain('"type": "acknowledgement"');
      expect(outboundStreamLog).toContain(`"${foodResourceComponentType.id}"`);
      expect(outboundStreamLog).toContain(`"${populationComponentType.id}"`);
    } finally {
      await ensureLogStreamClosed();
    }
  });
});
