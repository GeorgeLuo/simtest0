import { describe, expect, it } from '../../testHarness';

import { ComponentType } from '../../../src/ecs/components/ComponentType';

describe('ComponentType', () => {
  it('assigns a unique identifier per instance', () => {
    const first = new ComponentType<number>('position');
    const second = new ComponentType<number>('position');

    expect(first.id).not.toBe(second.id);
  });

  it('uses the provided validator to accept or reject values', () => {
    const type = new ComponentType<number>('speed', (value): value is number => typeof value === 'number');

    expect(type.validate(10)).toBe(true);
    expect(type.validate('fast')).toBe(false);
  });

  it('accepts any value when no validator is supplied', () => {
    const type = new ComponentType<unknown>('generic');

    expect(type.validate(10)).toBe(true);
    expect(type.validate({})).toBe(true);
    expect(type.validate(null)).toBe(true);
  });
});
