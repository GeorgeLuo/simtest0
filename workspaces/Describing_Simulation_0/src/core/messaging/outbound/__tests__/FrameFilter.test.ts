import { FrameFilter } from '../FrameFilter';
import type { Frame } from '../Frame';

describe('FrameFilter', () => {
  it('removes blacklisted components without mutating original frame', () => {
    const filter = new FrameFilter(['temperature']);
    const frame: Frame = {
      tick: 1,
      entities: {
        entityA: { time: { tick: 1 }, temperature: { value: 70 } },
        entityB: { humidity: { value: 40 } },
      },
    };

    const clone = JSON.parse(JSON.stringify(frame));
    const filtered = filter.apply(frame);

    expect(filtered.entities.entityA).toEqual({ time: { tick: 1 } });
    expect(filtered.entities.entityB).toEqual(clone.entities.entityB);
    expect(frame).toEqual(clone);
  });
});
