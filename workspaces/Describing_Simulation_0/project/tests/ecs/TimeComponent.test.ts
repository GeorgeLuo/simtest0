import { describe, expect, it } from 'vitest';

import { timeComponentType } from '../../src/ecs/components/implementations/TimeComponent.js';

describe('TimeComponent', () => {
  it('exposes metadata describing the component schema and defaults', () => {
    expect(timeComponentType.metadata).toMatchObject({
      id: 'time',
      name: 'Time',
      description: 'Tracks the advancement of simulated time.',
    });

    expect(timeComponentType.metadata.schema).toStrictEqual({
      ticks: {
        description: 'Total elapsed ticks since the simulation began.',
        defaultValue: 0,
      },
      deltaPerUpdate: {
        description: 'How many ticks to advance on each update step.',
        defaultValue: 1,
      },
    });

    expect(timeComponentType.metadata.defaults).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });
  });

  it('creates component instances while preserving defaults', () => {
    expect(timeComponentType.create()).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });

    const advanced = timeComponentType.create({ ticks: 12 });
    expect(advanced).toStrictEqual({
      ticks: 12,
      deltaPerUpdate: 1,
    });

    expect(timeComponentType.metadata.defaults).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });
  });
});
