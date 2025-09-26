import { EvaluationPlayer } from '../src/core/evalplayer/EvaluationPlayer';
import { ComponentManager } from '../src/core/components/ComponentManager';
import { EntityManager } from '../src/core/entity/EntityManager';
import { SystemManager } from '../src/core/systems/SystemManager';
import { Bus, acknowledge, noAcknowledgement } from 'src/core/messaging';
import type { SnapshotFrame } from '../src/core/IOPlayer';

describe('EvaluationPlayer', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('materializes injected frame entities and components', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new EvaluationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
    );

    const acknowledgement = inboundBus.send(
      'simulation/frame',
      {
        entities: [
          {
            id: 'entity-1',
            components: { sample: { value: 5 } },
          },
        ],
      },
      { tick: 0, timestamp: 0, deltaSeconds: 0 },
    );

    expect(acknowledgement).toEqual(acknowledge());
    expect(entities.list().map((entity) => entity.id)).toEqual(['entity-1']);

    const registeredType = components
      .registeredTypes()
      .find((type) => type.name === 'sample');
    expect(registeredType).toBeDefined();
    expect(components.getComponent('entity-1', registeredType!)).toEqual({ value: 5 });

    player.stop();
  });

  it('removes redundant entity and component data when omitted', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new EvaluationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
    );

    inboundBus.send(
      'simulation/frame',
      {
        entities: [
          {
            id: 'entity-1',
            components: { alpha: 1, beta: 2 },
          },
          {
            id: 'entity-2',
            components: { gamma: 3 },
          },
        ],
      },
      { tick: 1, timestamp: 0, deltaSeconds: 0 },
    );

    const ack = inboundBus.send(
      'simulation/frame',
      {
        entities: [
          {
            id: 'entity-1',
            components: { beta: 2 },
          },
        ],
      },
      { tick: 2, timestamp: 0, deltaSeconds: 0 },
    );

    expect(ack).toEqual(acknowledge());

    const remainingEntities = entities.list().map((entity) => entity.id);
    expect(remainingEntities).toEqual(['entity-1']);

    const remainingComponents = Array.from(
      components.getComponentsForEntity('entity-1').keys(),
    ).map((type) => type.name);
    expect(remainingComponents).toEqual(['beta']);

    player.stop();
  });

  it('returns a negative acknowledgement when payload validation fails', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const player = new EvaluationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
    );

    inboundBus.send(
      'simulation/frame',
      {
        entities: [
          {
            id: 'entity-1',
            components: { value: 1 },
          },
        ],
      },
      { tick: 1, timestamp: 0, deltaSeconds: 0 },
    );

    const acknowledgement = inboundBus.send(
      'simulation/frame',
      {
        entities: [
          {
            id: '',
            components: { value: 2 },
          },
        ],
      },
      { tick: 2, timestamp: 0, deltaSeconds: 0 },
    );

    expect(acknowledgement).toEqual(noAcknowledgement());

    const registeredType = components
      .registeredTypes()
      .find((type) => type.name === 'value');
    expect(registeredType).toBeDefined();
    expect(components.getComponent('entity-1', registeredType!)).toEqual(1);

    player.stop();
  });

  it('suppresses outbound frames when the latest injection is historical', () => {
    jest.useFakeTimers();

    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();

    const time = { now: 0 };
    const timeProvider = jest.fn(() => time.now);

    const frames: SnapshotFrame[] = [];
    outboundBus.subscribe((frame) => {
      frames.push(frame as SnapshotFrame);
      return acknowledge();
    });

    const player = new EvaluationPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
      { tickIntervalMs: 5, timeProvider },
    );

    player.start();

    inboundBus.send(
      'simulation/frame',
      { entities: [] },
      { tick: 1, timestamp: 0, deltaSeconds: 0, historical: true },
    );

    time.now += 5;
    jest.advanceTimersByTime(5);

    expect(frames).toHaveLength(0);

    inboundBus.send(
      'simulation/frame',
      { entities: [] },
      { tick: 2, timestamp: 5, deltaSeconds: 0, historical: false },
    );

    time.now += 5;
    jest.advanceTimersByTime(5);

    expect(frames).toHaveLength(1);
    expect(frames[0].metadata.tick).toBe(2);

    player.stop();
  });
});
