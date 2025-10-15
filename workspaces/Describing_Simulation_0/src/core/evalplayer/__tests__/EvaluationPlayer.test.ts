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
import type { SystemContext } from '../../systems/System';

describe('EvaluationPlayer', () => {
  const createPlayer = () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const systemManager = new SystemManager(entityManager, componentManager);
    const inboundBus = new Bus<unknown>();
    const outboundBus = new Bus<Frame | Acknowledgement>();
    const frameFilter = new FrameFilter();
    const handlers = new InboundHandlerRegistry<EvaluationPlayer>();

    const player = new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter, handlers);
    return { player, inboundBus, outboundBus, frameFilter };
  };

  it('stores frames, persists ECS entities, and publishes filtered frame on inject', () => {
    const { player, outboundBus, frameFilter } = createPlayer();
    const payload = { messageId: 'f-1', frame: { tick: 1, entities: {} } as Frame };
    const filteredFrame = { tick: 1, entities: { filtered: true } } as unknown as Frame;
    const applySpy = jest.spyOn(frameFilter, 'apply').mockReturnValue(filteredFrame);

    const publishedFrames: Frame[] = [];
    outboundBus.subscribe((message) => {
      if (message && typeof message === 'object' && 'tick' in message) {
        publishedFrames.push(message as Frame);
      }
    });

    player.injectFrame(payload);

    expect(player.getFrames()).toEqual([payload]);
    expect(applySpy).toHaveBeenCalledWith(payload.frame);
    expect(publishedFrames).toContain(filteredFrame);

    const context = (player as unknown as { getContext(): SystemContext }).getContext();
    const entities = context.entityManager.list();
    expect(entities).toHaveLength(1);
    const [entity] = entities;
    const components = context.componentManager.getComponents(entity);
    expect(components).toHaveLength(1);
    expect(components[0]?.type.id).toBe('evaluation.frame');
    expect(components[0]?.payload).toBe(payload.frame);
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

    const context = (player as unknown as { getContext(): SystemContext }).getContext();
    const entities = context.entityManager.list();
    expect(entities).toHaveLength(1);
  });
});
