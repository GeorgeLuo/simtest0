import { IOPlayer } from '../src/core/IOPlayer';
import { ComponentManager } from '../src/core/components/ComponentManager';
import { ComponentType } from '../src/core/components/ComponentType';
import { EntityManager } from '../src/core/entity/EntityManager';
import { SystemManager } from '../src/core/systems/SystemManager';
import {
  Bus,
  InboundHandlerRegistry,
  acknowledge,
  matchType,
  noAcknowledgement,
} from 'src/core/messaging';
import type { SnapshotFrame } from '../src/core/IOPlayer';

describe('IOPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('dispatches inbound commands and propagates acknowledgements', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();
    const registry = new InboundHandlerRegistry();

    let player!: IOPlayer;
    registry.register({
      id: 'start',
      filter: matchType('start'),
      handle: () => {
        player.start();
        return acknowledge();
      },
    });
    registry.register({
      id: 'pause',
      filter: matchType('pause'),
      handle: () => {
        player.pause();
        return acknowledge();
      },
    });
    registry.register({
      id: 'stop',
      filter: matchType('stop'),
      handle: () => {
        player.stop();
        return acknowledge();
      },
    });

    player = new IOPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
      registry,
      { tickIntervalMs: 5 },
    );

    expect(inboundBus.send('start', undefined)).toEqual(acknowledge());
    expect(inboundBus.send('pause', undefined)).toEqual(acknowledge());
    expect(inboundBus.send('stop', undefined)).toEqual(acknowledge());

    expect(inboundBus.send('pause', undefined)).toEqual(noAcknowledgement());

    player.start();

    expect(inboundBus.send('pause', undefined)).toEqual(acknowledge());
  });

  it('publishes filtered frame snapshots on each tick', () => {
    const components = new ComponentManager();
    const entities = new EntityManager(components);
    const systems = new SystemManager();
    const inboundBus = new Bus();
    const outboundBus = new Bus();
    const registry = new InboundHandlerRegistry();

    const SampleComponent = new ComponentType<{ value: number }>('sample');
    components.register(SampleComponent);
    const entity = entities.create('entity-a');
    components.setComponent(entity.id, SampleComponent, { value: 42 });

    let currentTime = 0;
    const timeProvider = jest.fn(() => currentTime);

    const frames: SnapshotFrame[] = [];
    outboundBus.subscribe((frame) => {
      frames.push(frame as SnapshotFrame);
      return acknowledge();
    });

    const player = new IOPlayer(
      entities,
      components,
      systems,
      inboundBus,
      outboundBus,
      registry,
      {
        tickIntervalMs: 10,
        timeProvider,
        frameFilter: (frame) => frame.metadata.tick % 2 === 1,
      },
    );

    player.start();

    for (let i = 0; i < 3; i += 1) {
      currentTime += 10;
      jest.advanceTimersByTime(10);
    }

    expect(frames).toHaveLength(2);
    expect(frames[0].metadata.tick).toBe(1);
    expect(frames[0].metadata.deltaSeconds).toBeCloseTo(0.01);
    expect(frames[0].payload.entities).toEqual([
      { id: 'entity-a', components: { sample: { value: 42 } } },
    ]);

    expect(frames[1].metadata.tick).toBe(3);
  });
});
