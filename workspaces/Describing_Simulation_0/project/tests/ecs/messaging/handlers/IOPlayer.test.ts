import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentManager } from '../../../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../../../src/ecs/components/ComponentType.js';
import { timeComponentType } from '../../../../src/ecs/components/implementations/TimeComponent.js';
import { EntityManager } from '../../../../src/ecs/entity/EntityManager.js';
import { Bus } from '../../../../src/ecs/messaging/Bus.js';
import {
  IOPlayer,
  type InboundMessage,
  type OutboundMessage,
} from '../../../../src/ecs/messaging/IOPlayer.js';
import type { SnapshotEntity } from '../../../../src/ecs/Player.js';
import type { FrameMessage } from '../../../../src/ecs/messaging/handlers/outbound/implementations/Frame.js';
import type {
  AcknowledgementMessage,
} from '../../../../src/ecs/messaging/handlers/outbound/implementations/Acknowledgement.js';
import type {
  InjectEntityMessage,
} from '../../../../src/ecs/messaging/handlers/inbound/implementations/InjectEntity.js';
import type {
  PauseMessage,
} from '../../../../src/ecs/messaging/handlers/inbound/implementations/Pause.js';
import type {
  StartMessage,
} from '../../../../src/ecs/messaging/handlers/inbound/implementations/Start.js';
import type {
  StopMessage,
} from '../../../../src/ecs/messaging/handlers/inbound/implementations/Stop.js';
import { SystemManager } from '../../../../src/ecs/systems/SystemManager.js';
import { TimeSystem } from '../../../../src/ecs/systems/implementations/TimeSystem.js';

const positionType = createComponentType({
  id: 'position',
  name: 'Position',
  description: 'Tracks 2D position.',
  schema: {
    x: {
      description: 'Horizontal coordinate.',
      defaultValue: 0,
    },
    y: {
      description: 'Vertical coordinate.',
      defaultValue: 0,
    },
  },
});

describe('IOPlayer messaging handlers', () => {
  let componentManager: ComponentManager;
  let entityManager: EntityManager;
  let systemManager: SystemManager;
  let inboundBus: Bus<InboundMessage>;
  let outboundBus: Bus<OutboundMessage>;
  let player: IOPlayer;
  let outboundMessages: OutboundMessage[];

  beforeEach(() => {
    componentManager = new ComponentManager();
    entityManager = new EntityManager(componentManager);
    systemManager = new SystemManager();
    inboundBus = new Bus<InboundMessage>();
    outboundBus = new Bus<OutboundMessage>();
    outboundMessages = [];

    outboundBus.subscribe(async (message) => {
      outboundMessages.push(message);
    });

    player = new IOPlayer(
      entityManager,
      componentManager,
      systemManager,
      inboundBus,
      outboundBus,
      { tickIntervalMs: 10, deltaTime: 1 },
    );
  });

  afterEach(async () => {
    await player.stop();
    player.dispose();
    vi.useRealTimers();
  });

  const getAcknowledgements = (): AcknowledgementMessage[] =>
    outboundMessages.filter(
      (message): message is AcknowledgementMessage =>
        message.type === 'acknowledgement',
    );

  const getFrames = (): FrameMessage[] =>
    outboundMessages.filter((message): message is FrameMessage => message.type === 'frame');

  it('processes start, pause, and stop commands with acknowledgements', async () => {
    vi.useFakeTimers();
    const startMessage: StartMessage = { id: 'start-1', type: 'start', payload: {} };
    const pauseMessage: PauseMessage = { id: 'pause-1', type: 'pause', payload: {} };
    const stopMessage: StopMessage = { id: 'stop-1', type: 'stop', payload: {} };

    await inboundBus.publish(startMessage);
    await inboundBus.publish(pauseMessage);
    await inboundBus.publish(stopMessage);

    const acknowledgements = getAcknowledgements();
    expect(acknowledgements).toHaveLength(3);
    expect(acknowledgements.map((ack) => ack.payload)).toEqual([
      { status: 'success', messageId: 'start-1' },
      { status: 'success', messageId: 'pause-1' },
      { status: 'success', messageId: 'stop-1' },
    ]);
  });

  it('injects entities using provided component payloads', async () => {
    componentManager.registerType(positionType);

    const message: InjectEntityMessage = {
      id: 'inject-1',
      type: 'inject-entity',
      payload: {
        id: 42,
        components: [
          {
            typeId: positionType.id,
            values: { x: 5, y: -3 },
          },
        ],
      },
    };

    await inboundBus.publish(message);

    const acknowledgements = getAcknowledgements();
    expect(acknowledgements).toHaveLength(1);
    expect(acknowledgements[0]?.payload).toEqual({
      status: 'success',
      messageId: 'inject-1',
    });

    expect(entityManager.has(42)).toBe(true);
    expect(componentManager.getComponent(42, positionType)).toEqual({ x: 5, y: -3 });

    const frames = getFrames();
    const latestFrame = frames.at(-1);
    expect(latestFrame?.payload.entities).toContainEqual({
      id: 42,
      components: {
        [positionType.id]: { x: 5, y: -3 },
      },
    });
  });

  it('returns an error acknowledgement when injecting unknown component types', async () => {
    const message: InjectEntityMessage = {
      id: 'inject-error',
      type: 'inject-entity',
      payload: {
        id: 7,
        components: [
          {
            typeId: 'non-existent',
            values: {},
          },
        ],
      },
    };

    await inboundBus.publish(message);

    const acknowledgements = getAcknowledgements();
    expect(acknowledgements).toHaveLength(1);
    expect(acknowledgements[0]?.payload.status).toBe('error');
    expect(acknowledgements[0]?.payload.messageId).toBe('inject-error');
    expect(acknowledgements[0]?.payload.error).toMatch(
      'Component type "non-existent" is not registered',
    );
  });

  it('emits frames while running and halts emission after pause', async () => {
    vi.useFakeTimers();

    componentManager.registerType(timeComponentType);

    const entityId = 99;
    const injectMessage: InjectEntityMessage = {
      id: 'inject-time',
      type: 'inject-entity',
      payload: {
        id: entityId,
        components: [
          {
            typeId: timeComponentType.id,
          },
        ],
      },
    };

    await inboundBus.publish(injectMessage);

    const timeSystem = new TimeSystem(componentManager, entityId);
    systemManager.register(timeSystem);

    const startMessage: StartMessage = { id: 'start-loop', type: 'start', payload: {} };
    await inboundBus.publish(startMessage);

    await vi.advanceTimersByTimeAsync(30);

    const framesAfterStart = getFrames();
    const latestFrame = framesAfterStart.at(-1);
    expect(latestFrame?.payload.tick).toBeGreaterThanOrEqual(3);

    const entitySnapshot = latestFrame?.payload.entities.find(
      (entity: SnapshotEntity) => entity.id === entityId,
    );
    expect(entitySnapshot?.components[timeComponentType.id]).toEqual({
      ticks: latestFrame?.payload.tick,
      deltaPerUpdate: 1,
    });

    const pauseMessage: PauseMessage = { id: 'pause-loop', type: 'pause', payload: {} };
    await inboundBus.publish(pauseMessage);

    const framesBeforePause = getFrames().length;

    await vi.advanceTimersByTimeAsync(50);

    expect(getFrames().length).toBe(framesBeforePause);
  });
});
