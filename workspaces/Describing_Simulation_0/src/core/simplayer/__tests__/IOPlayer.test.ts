import { IOPlayer } from '../../IOPlayer';
import { EntityManager } from '../../entity/EntityManager';
import { ComponentManager } from '../../components/ComponentManager';
import { SystemManager } from '../../systems/SystemManager';
import { System } from '../../systems/System';
import { Bus } from '../../messaging/Bus';
import { FrameFilter } from '../../messaging/outbound/FrameFilter';
import { InboundHandlerRegistry } from '../../messaging/inbound/InboundHandlerRegistry';
import type { ComponentType } from '../../components/ComponentType';

class TickRecorderSystem extends System {
  private readonly entityManager: EntityManager;
  private readonly componentManager: ComponentManager;
  private entity: number | null = null;
  private readonly temperature: ComponentType<{ value: number }>;

  constructor(entityManager: EntityManager, componentManager: ComponentManager) {
    super();
    this.entityManager = entityManager;
    this.componentManager = componentManager;
    this.temperature = { id: 'temperature', validate: () => true };
  }

  override initialize(): void {
    this.entity = this.entityManager.create();
    this.componentManager.addComponent(this.entity, this.temperature, { value: 60 });
  }

  override update(): void {
    if (this.entity === null) {
      return;
    }

    const current = this.componentManager.getComponent(this.entity, this.temperature);
    const nextValue = current ? current.payload.value + 1 : 60;
    this.componentManager.addComponent(this.entity, this.temperature, { value: nextValue });
  }
}

describe('IOPlayer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('publishes filtered frames per tick and increments tick counter', () => {
    jest.useFakeTimers({ advanceTimers: true });

    const entityManager = new EntityManager();
    const componentManager = new ComponentManager();
    const systemManager = new SystemManager(entityManager, componentManager);
    const tickSystem = new TickRecorderSystem(entityManager, componentManager);
    systemManager.addSystem(tickSystem);

    const inboundBus = new Bus<unknown>();
    const outboundBus = new Bus<any>();
    const frameFilter = new FrameFilter();
    jest.spyOn(frameFilter, 'apply');
    const handlers = new InboundHandlerRegistry<IOPlayer>();

    const player = new IOPlayer(systemManager, inboundBus, outboundBus, frameFilter, handlers, 10);

    const frames: any[] = [];
    outboundBus.subscribe((message) => {
      frames.push(message);
    });

    player.start();
    jest.advanceTimersByTime(25);
    player.stop();

    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames[0]).toMatchObject({ tick: 0 });
    expect(frames[0]).not.toBe(frames[1]);
    expect(frames[frames.length - 1].tick).toBeGreaterThan(frames[0].tick);
    expect(frameFilter.apply).toHaveBeenCalledTimes(frames.length);
    expect(frames.every((frame) => frame.entities)).toBe(true);

    const entityId = Object.keys(frames[0].entities)[0];
    frames[0].entities[entityId].temperature.value = 999;
    expect(frames[frames.length - 1].entities[entityId].temperature.value).not.toBe(999);
  });
});
