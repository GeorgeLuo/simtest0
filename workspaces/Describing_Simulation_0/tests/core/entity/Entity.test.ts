import { describe, expect, it } from 'vitest';
import { Entity } from '../../../src/core/entity/Entity';

describe('Entity', () => {
  it('represents entities as numeric identifiers', () => {
    const entity: Entity = 42;
    expect(typeof entity).toBe('number');
  });

  it('compares equality by numeric identity', () => {
    const left: Entity = 7;
    const right: Entity = 7;
    expect(left).toBe(right);
  });
});
