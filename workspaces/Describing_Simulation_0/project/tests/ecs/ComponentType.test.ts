import { describe, expect, it } from 'vitest';

import {
  createComponentType,
  type ComponentSchema,
} from '../../src/ecs/components/ComponentType.js';

describe('ComponentType', () => {
  interface TimeComponent {
    ticks: number;
    deltaPerUpdate: number;
  }

  const timeSchema = {
    ticks: {
      description: 'Total elapsed ticks since the simulation began.',
      defaultValue: 0,
    },
    deltaPerUpdate: {
      description: 'How many ticks to advance on each update step.',
      defaultValue: 1,
    },
  } satisfies ComponentSchema<TimeComponent>;

  const timeDescriptor = createComponentType<TimeComponent>({
    id: 'time',
    name: 'Time',
    description: 'Tracks the advancement of simulated time.',
    schema: timeSchema,
  });

  it('describes component schema fields and default values through metadata', () => {
    expect(timeDescriptor.metadata).toMatchObject({
      id: 'time',
      name: 'Time',
      description: 'Tracks the advancement of simulated time.',
    });
    expect(timeDescriptor.metadata.schema).toStrictEqual(timeSchema);
    expect(timeDescriptor.metadata.defaults).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });
  });

  it('creates component instances by merging defaults with provided overrides', () => {
    const defaultInstance = timeDescriptor.create();
    expect(defaultInstance).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });

    const overriddenInstance = timeDescriptor.create({ ticks: 5 });
    expect(overriddenInstance).toStrictEqual({
      ticks: 5,
      deltaPerUpdate: 1,
    });
    expect(overriddenInstance).not.toBe(timeDescriptor.metadata.defaults);

    const deltaOnlyInstance = timeDescriptor.create({ deltaPerUpdate: 3 });
    expect(deltaOnlyInstance).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 3,
    });

    // Ensure defaults remain unchanged after creating new instances.
    expect(timeDescriptor.metadata.defaults).toStrictEqual({
      ticks: 0,
      deltaPerUpdate: 1,
    });
  });
});
