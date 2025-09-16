import { describe, expect, it } from 'vitest';

import { TimeSystem } from '../../src/ecs/systems/implementations/TimeSystem.js';

describe('TimeSystem', () => {
  it('tracks tick counts and timing metadata across updates', () => {
    const system = new TimeSystem();

    expect(system.ticks).toBe(0);
    expect(system.deltaTime).toBe(0);
    expect(system.elapsedTime).toBe(0);

    system.update({ deltaTime: 0.016, elapsedTime: 0.016 });

    expect(system.ticks).toBe(1);
    expect(system.deltaTime).toBeCloseTo(0.016);
    expect(system.elapsedTime).toBeCloseTo(0.016);

    system.update({ deltaTime: 0.024, elapsedTime: 0.04 });

    expect(system.ticks).toBe(2);
    expect(system.deltaTime).toBeCloseTo(0.024);
    expect(system.elapsedTime).toBeCloseTo(0.04);

    system.update({ deltaTime: 0.01, elapsedTime: 0.05 });

    expect(system.ticks).toBe(3);
    expect(system.deltaTime).toBeCloseTo(0.01);
    expect(system.elapsedTime).toBeCloseTo(0.05);
  });
});
