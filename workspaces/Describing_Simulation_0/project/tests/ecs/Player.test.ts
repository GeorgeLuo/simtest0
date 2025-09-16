import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Player } from '../../src/ecs/Player.js';
import { ComponentManager } from '../../src/ecs/components/ComponentManager.js';
import { createComponentType } from '../../src/ecs/components/ComponentType.js';
import { EntityManager } from '../../src/ecs/entity/EntityManager.js';
import { SystemManager } from '../../src/ecs/systems/SystemManager.js';

const createManagers = () => {
  const componentManager = new ComponentManager();
  const entityManager = new EntityManager(componentManager);
  const systemManager = new SystemManager();

  return { componentManager, entityManager, systemManager };
};

describe('Player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('start initializes systems and advances ticks', async () => {
    const { componentManager, entityManager, systemManager } = createManagers();
    const initializeSpy = vi.spyOn(systemManager, 'initializeAll');
    const updateSpy = vi.spyOn(systemManager, 'update');

    const player = new Player(entityManager, componentManager, systemManager, {
      tickIntervalMs: 1,
      deltaTime: 0.5,
    });

    await player.start();

    expect(player.status).toBe('running');
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).not.toHaveBeenCalled();

    await vi.runOnlyPendingTimersAsync();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(player.ticks).toBe(1);
    expect(player.elapsed).toBeCloseTo(0.5);

    await vi.runOnlyPendingTimersAsync();
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(player.ticks).toBe(2);
    expect(player.elapsed).toBeCloseTo(1);
  });

  it('pause halts updates without resetting tick count', async () => {
    const { componentManager, entityManager, systemManager } = createManagers();
    const updateSpy = vi.spyOn(systemManager, 'update');

    const player = new Player(entityManager, componentManager, systemManager, {
      tickIntervalMs: 1,
      deltaTime: 0.25,
    });

    await player.start();
    await vi.runOnlyPendingTimersAsync();

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(player.ticks).toBe(1);
    expect(player.elapsed).toBeCloseTo(0.25);

    await player.pause();

    expect(player.status).toBe('paused');

    await vi.runOnlyPendingTimersAsync();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(player.ticks).toBe(1);
    expect(player.elapsed).toBeCloseTo(0.25);
  });

  it('stop shuts down systems, clears entities, and resets counters', async () => {
    const { componentManager, entityManager, systemManager } = createManagers();
    const updateSpy = vi.spyOn(systemManager, 'update');
    const shutdownSpy = vi.spyOn(systemManager, 'shutdownAll');
    const destroyAllSpy = vi.spyOn(entityManager, 'destroyAll');

    const player = new Player(entityManager, componentManager, systemManager, {
      tickIntervalMs: 1,
      deltaTime: 0.75,
    });

    await player.start();
    await vi.runOnlyPendingTimersAsync();

    entityManager.create();
    expect(entityManager.getAll()).toHaveLength(1);
    const updateCountBeforeStop = updateSpy.mock.calls.length;

    await player.stop();

    expect(player.status).toBe('stopped');
    expect(shutdownSpy).toHaveBeenCalledTimes(1);
    expect(destroyAllSpy).toHaveBeenCalledTimes(1);
    expect(entityManager.getAll()).toHaveLength(0);
    expect(player.ticks).toBe(0);
    expect(player.elapsed).toBe(0);

    await vi.runOnlyPendingTimersAsync();
    expect(updateSpy).toHaveBeenCalledTimes(updateCountBeforeStop);
  });

  it('injectEntity registers components correctly', async () => {
    const { componentManager, entityManager, systemManager } = createManagers();
    const player = new Player(entityManager, componentManager, systemManager);

    const positionType = createComponentType({
      id: 'position',
      name: 'Position',
      description: 'Tracks spatial location',
      schema: {
        x: { description: 'Horizontal position', defaultValue: 0 },
        y: { description: 'Vertical position', defaultValue: 0 },
      },
    });

    componentManager.registerType(positionType);

    const entity = await player.injectEntity({
      id: 42,
      components: [
        {
          typeId: positionType.id,
          values: { x: 5 },
        },
      ],
    });

    expect(entity.id).toBe(42);
    expect(entityManager.has(entity.id)).toBe(true);

    const component = componentManager.getComponent(entity.id, positionType);

    expect(component).toEqual({ x: 5, y: 0 });
  });
});
