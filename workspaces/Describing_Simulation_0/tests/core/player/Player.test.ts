import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from '../../../src/core/player/Player';
import { System } from '../../../src/core/systems/System';
import { EntityManager } from '../../../src/core/entity/EntityManager';
import { ComponentManager } from '../../../src/core/components/ComponentManager';
import { SystemManager } from '../../../src/core/systems/SystemManager';
import { Bus } from '../../../src/core/messaging/Bus';
import { Frame, FrameFilter } from '../../../src/core/messaging/Frame';

class CounterSystem extends System {
  constructor(private readonly callback: () => void) {
    super('counter');
  }

  override update(): void {
    this.callback();
  }
}

describe('Player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('initializes core managers and registers the time system', () => {
    const player = new Player({ tickIntervalMs: 10 });

    expect(player.entityManager).toBeInstanceOf(EntityManager);
    expect(player.componentManager).toBeInstanceOf(ComponentManager);
    expect(player.systemManager).toBeInstanceOf(SystemManager);
    expect(player.currentState).toBe('idle');

    const systemIds = player.systemManager.listSystems().map((system) => system.id);
    expect(systemIds).toContain(player.timeSystem.id);
  });

  it('starts the update loop and advances time', () => {
    const player = new Player({ tickIntervalMs: 10 });

    player.start();

    expect(player.currentState).toBe('running');

    const [timeEntity] = player.componentManager.getEntitiesWith(player.timeComponent);
    const timeBeforeTick = player.componentManager.getComponent(timeEntity, player.timeComponent)?.data.tick ?? 0;

    vi.advanceTimersByTime(30);

    const timeAfterTick = player.componentManager.getComponent(timeEntity, player.timeComponent)?.data.tick ?? 0;
    expect(timeAfterTick).toBeGreaterThan(timeBeforeTick);
  });

  it('pauses and resumes the update loop', () => {
    const player = new Player({ tickIntervalMs: 10 });

    player.start();
    vi.advanceTimersByTime(30);

    const [timeEntity] = player.componentManager.getEntitiesWith(player.timeComponent);
    const beforePause = player.componentManager.getComponent(timeEntity, player.timeComponent)?.data.tick ?? 0;

    player.pause();
    expect(player.currentState).toBe('paused');

    vi.advanceTimersByTime(50);
    const pausedValue = player.componentManager.getComponent(timeEntity, player.timeComponent)?.data.tick ?? 0;
    expect(pausedValue).toBe(beforePause);

    player.start();
    vi.advanceTimersByTime(20);
    const resumedValue = player.componentManager.getComponent(timeEntity, player.timeComponent)?.data.tick ?? 0;
    expect(resumedValue).toBeGreaterThan(pausedValue);
  });

  it('stops the simulation and resets state', () => {
    const player = new Player({ tickIntervalMs: 10 });
    player.start();
    vi.advanceTimersByTime(30);

    player.stop();

    expect(player.currentState).toBe('idle');
    expect(player.entityManager.listEntities()).toHaveLength(1);

    const [timeEntity] = player.componentManager.getEntitiesWith(player.timeComponent);
    const timeComponent = player.componentManager.getComponent(timeEntity, player.timeComponent);
    expect(timeComponent?.data.tick).toBe(0);

    const systemIds = player.systemManager.listSystems().map((system) => system.id);
    expect(systemIds).toEqual([player.timeSystem.id]);
  });

  it('injects additional systems via the system manager', () => {
    const player = new Player({ tickIntervalMs: 10 });
    const callback = vi.fn();
    const system = new CounterSystem(callback);

    player.injectSystem(system);
    player.start();

    vi.advanceTimersByTime(20);

    expect(callback).toHaveBeenCalled();
  });

  it('publishes filtered frames on the outbound bus', () => {
    const bus = new Bus<Frame>();
    const frames: Frame[] = [];
    bus.subscribe((frame) => frames.push(frame));

    const filter = new FrameFilter(['core.time']);
    const player = new Player({ tickIntervalMs: 10, outboundBus: bus, frameFilter: filter });

    player.start();
    vi.advanceTimersByTime(20);
    player.stop();

    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      for (const components of Object.values(frame.entities)) {
        expect(components).not.toHaveProperty('core.time');
      }
    }
  });
});
