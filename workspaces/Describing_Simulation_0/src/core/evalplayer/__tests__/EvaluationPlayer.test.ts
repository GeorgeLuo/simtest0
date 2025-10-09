import { EvaluationPlayer } from '../EvaluationPlayer';
import { InboundHandlerRegistry } from '../../messaging/inbound/InboundHandlerRegistry';
import type { SystemManager } from '../../systems/SystemManager';
import type { Bus } from '../../messaging/Bus';
import type { Frame } from '../../messaging/outbound/Frame';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { FrameFilter } from '../../messaging/outbound/FrameFilter';

describe('EvaluationPlayer', () => {
  const createPlayer = () => {
    const systemManager = {
      runCycle: jest.fn(),
      addSystem: jest.fn(),
      removeSystem: jest.fn(),
    } as unknown as SystemManager;

    const inboundBus = {
      subscribe: jest.fn(() => jest.fn()),
      publish: jest.fn(),
    } as unknown as Bus<unknown> & { subscribe: jest.Mock };

    const outboundBus = {
      publish: jest.fn(),
    } as unknown as Bus<Frame | Acknowledgement> & { publish: jest.Mock };

    const frameFilter = {
      apply: jest.fn((frame: Frame) => frame),
    } as unknown as FrameFilter & { apply: jest.Mock };

    const handlers = new InboundHandlerRegistry<EvaluationPlayer>();

    const player = new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter, handlers);
    return { player, systemManager, inboundBus, outboundBus, frameFilter };
  };

  it('stores frames and publishes filtered frame on inject', () => {
    const { player, outboundBus, frameFilter } = createPlayer();
    const payload = { messageId: 'f-1', frame: { tick: 1, entities: {} } as Frame };
    frameFilter.apply.mockReturnValue({ tick: 1, entities: { filtered: true } } as unknown as Frame);

    player.injectFrame(payload);

    expect(player.getFrames()).toEqual([payload]);
    expect(frameFilter.apply).toHaveBeenCalledWith(payload.frame);
    expect(outboundBus.publish).toHaveBeenCalledWith({ tick: 1, entities: { filtered: true } });
  });

  it('registers and removes conditions', () => {
    const { player } = createPlayer();
    const condition = { conditionId: 'cond-1', definition: { threshold: 10 } };
    player.registerCondition(condition);
    expect(player.getConditions()).toEqual([condition]);

    player.removeCondition({ conditionId: 'cond-1' });
    expect(player.getConditions()).toHaveLength(0);
  });
});
