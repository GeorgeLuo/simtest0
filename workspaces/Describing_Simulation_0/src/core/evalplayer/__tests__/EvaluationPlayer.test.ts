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
import type { Frame as OutboundFrame } from '../../messaging/outbound/Frame';

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

  it('resets stored frames and ECS state when a new run is detected via tick regression', () => {
    const { player, outboundBus } = createPlayer();
    const publishedFrames: Frame[] = [];
    outboundBus.subscribe((message) => {
      if (message && typeof message === 'object' && 'tick' in message) {
        publishedFrames.push(message as Frame);
      }
    });

    player.injectFrame({ messageId: 'f-1', frame: { tick: 5, entities: { first: {} } } as Frame });

    const firstContext = (player as unknown as { getContext(): SystemContext }).getContext();
    expect(firstContext.entityManager.list()).toHaveLength(1);

    player.injectFrame({ messageId: 'f-2', frame: { tick: 1, entities: { second: {} } } as Frame });

    expect(player.getFrames()).toEqual([{ messageId: 'f-2', frame: { tick: 1, entities: { second: {} } } }]);
    const context = (player as unknown as { getContext(): SystemContext }).getContext();
    const entities = context.entityManager.list();
    expect(entities).toHaveLength(1);
    const components = context.componentManager.getComponents(entities[0]);
    expect(components).toHaveLength(1);
    expect((components[0]?.payload as Frame).tick).toBe(1);

    expect(publishedFrames).toEqual([
      { tick: 5, entities: { first: {} } },
      { tick: 1, entities: { second: {} } },
    ]);
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

  it('filters evaluation.frame components from outbound frames', () => {
    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const systemManager = new SystemManager(entityManager, componentManager);
    const inboundBus = new Bus<unknown>();
    const outboundBus = new Bus<Frame | Acknowledgement>();
    const frameFilter = new FrameFilter(['evaluation.frame']);
    const player = new EvaluationPlayer(systemManager, inboundBus, outboundBus, frameFilter);

    const published: OutboundFrame[] = [];
    outboundBus.subscribe((message) => {
      if (message && typeof message === 'object' && 'tick' in message) {
        published.push(message as OutboundFrame);
      }
    });

    (player as unknown as { publishFrame(frame: OutboundFrame): void }).publishFrame({
      tick: 1,
      entities: { '1': { 'evaluation.frame': { tick: 0, entities: {} }, 'simulation.position': { y: 1 } } },
    } as OutboundFrame);

    expect(published).toHaveLength(1);
    const components = published[0].entities['1'] as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(components, 'evaluation.frame')).toBe(false);
    expect(components['simulation.position']).toEqual({ y: 1 });
  });
});
