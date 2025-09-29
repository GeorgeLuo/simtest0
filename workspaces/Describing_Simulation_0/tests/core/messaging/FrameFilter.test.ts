import { describe, expect, it } from 'vitest';
import { Frame, FrameFilter } from '../../../src/core/messaging/Frame';

describe('FrameFilter', () => {
  it('omits excluded component ids from frames', () => {
    const filter = new FrameFilter(['secret']);
    const frame: Frame = {
      tick: 3,
      entities: {
        1: {
          position: { x: 1 },
          secret: { code: 'xyz' }
        }
      }
    };

    const filtered = filter.filter(frame);

    expect(filtered).not.toBe(frame);
    expect(filtered.entities[1]).toEqual({ position: { x: 1 } });
  });

  it('returns identical structure when nothing is excluded', () => {
    const filter = new FrameFilter();
    const frame: Frame = {
      tick: 5,
      entities: {
        1: { velocity: { y: 2 } }
      }
    };

    const filtered = filter.filter(frame);
    expect(filtered).toEqual(frame);
    expect(filtered).not.toBe(frame);
  });
});
