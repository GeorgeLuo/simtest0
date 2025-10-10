import { EvaluationPlayer, EvaluationMessageType } from '../EvaluationPlayer';
import { InboundHandlerRegistry } from '../../messaging/inbound/InboundHandlerRegistry';
import { EntityManager } from '../../entity/EntityManager';
import { ComponentManager } from '../../components/ComponentManager';
import { SystemManager } from '../../systems/SystemManager';
import { Bus } from '../../messaging/Bus';
import { FrameFilter } from '../../messaging/outbound/FrameFilter';
import type { Frame } from '../../messaging/outbound/Frame';
import type { Acknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { ComponentType } from '../../components/ComponentType';

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
    return { player, inboundBus, outboundBus, frameFilter };
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

  it('registers and removes component definitions', () => {
    const { player } = createPlayer();
    const component: ComponentType<{ value: number }> = {
      id: 'temperature',
      validate: jest.fn(() => true),
    };

    player.registerComponent(component);
    expect(player.getRegisteredComponents()).toEqual([component]);

    const removed = player.removeComponent(component.id);
    expect(removed).toBe(true);
    expect(player.getRegisteredComponents()).toEqual([]);
  });

  it('acknowledges inbound inject frame messages', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const systemManager = new SystemManager(entityManager, componentManager);
    const inboundBus = new Bus<any>();
    const outboundBus = new Bus<any>();
    const frameFilter = new FrameFilter();
    const player = new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter);

    const acknowledgements: any[] = [];
    outboundBus.subscribe((message) => {
      if (message && typeof message === 'object' && 'status' in message) {
        acknowledgements.push(message);
      }
    });

    inboundBus.publish({
      type: EvaluationMessageType.INJECT_FRAME,
      payload: { messageId: 'frame-1', frame: { tick: 1, entities: {} } },
    });

    expect(acknowledgements).toContainEqual({ messageId: 'frame-1', status: 'success' });
    expect(player.getFrames()).toHaveLength(1);
  });
});
