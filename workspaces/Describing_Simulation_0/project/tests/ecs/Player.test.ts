import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Player } from '../../src/ecs/Player.js';
import type { System } from '../../src/ecs/systems/System.js';

const advanceBy = async (milliseconds: number) => {
  await vi.advanceTimersByTimeAsync(milliseconds);
};

describe('Player', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts the update loop and forwards delta times to the system manager', async () => {
    const player = new Player({
      stepIntervalMs: 50,
      fixedDeltaTimeSeconds: 0.05,
    });

    const deltas: number[] = [];
    const elapsed: number[] = [];

    player.systemManager.register({
      id: 'tracker',
      update: (context) => {
        deltas.push(context.deltaTime);
        elapsed.push(context.elapsedTime);
      },
    });

    const initializeSpy = vi.spyOn(player.systemManager, 'initializeAll');

    await player.start();

    expect(player.getStatus()).toBe('running');
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    initializeSpy.mockRestore();

    await advanceBy(150);

    expect(deltas.length).toBe(3);
    for (const delta of deltas) {
      expect(delta).toBeCloseTo(0.05);
    }

    expect(elapsed.length).toBe(3);
    expect(elapsed[0]).toBeCloseTo(0.05);
    expect(elapsed[1]).toBeCloseTo(0.1);
    expect(elapsed[2]).toBeCloseTo(0.15);

    await player.stop();
  });

  it('pauses and resumes without reinitializing systems', async () => {
    const player = new Player({
      stepIntervalMs: 40,
      fixedDeltaTimeSeconds: 0.04,
    });

    const initializeMock = vi.fn();
    const updateMock = vi.fn();
    const shutdownMock = vi.fn();

    const system: System = {
      id: 'loop',
      initialize: initializeMock,
      update: updateMock,
      shutdown: shutdownMock,
    };

    player.systemManager.register(system);

    const initializeSpy = vi.spyOn(player.systemManager, 'initializeAll');

    await player.start();
    expect(player.getStatus()).toBe('running');
    expect(initializeSpy).toHaveBeenCalledTimes(1);

    await advanceBy(80);

    const callsAfterStart = updateMock.mock.calls.length;
    expect(callsAfterStart).toBeGreaterThan(0);

    await player.pause();
    expect(player.getStatus()).toBe('paused');

    await advanceBy(200);
    expect(updateMock.mock.calls.length).toBe(callsAfterStart);

    await player.start();
    expect(player.getStatus()).toBe('running');
    expect(initializeSpy).toHaveBeenCalledTimes(1);

    await advanceBy(80);
    expect(updateMock.mock.calls.length).toBeGreaterThan(callsAfterStart);

    await player.stop();
    expect(player.getStatus()).toBe('idle');
    expect(shutdownMock).toHaveBeenCalledTimes(1);

    initializeSpy.mockRestore();
  });

  it('stops the simulation, shuts down systems, and clears entities', async () => {
    const player = new Player({
      stepIntervalMs: 30,
      fixedDeltaTimeSeconds: 0.03,
    });

    const initializeMock = vi.fn();
    const updateMock = vi.fn();
    const shutdownMock = vi.fn();

    const system: System = {
      id: 'timekeeper',
      initialize: initializeMock,
      update: updateMock,
      shutdown: shutdownMock,
    };

    player.systemManager.register(system);

    player.entityManager.create();
    player.entityManager.create();

    await player.start();
    await advanceBy(90);

    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls.length).toBeGreaterThan(0);
    expect(player.entityManager.getAll().length).toBe(2);

    await player.stop();

    expect(player.getStatus()).toBe('idle');
    expect(shutdownMock).toHaveBeenCalledTimes(1);
    expect(player.entityManager.getAll()).toEqual([]);

    const callsAfterStop = updateMock.mock.calls.length;
    await advanceBy(90);
    expect(updateMock.mock.calls.length).toBe(callsAfterStop);

    await player.start();
    expect(initializeMock).toHaveBeenCalledTimes(2);

    await player.stop();
  });
});
