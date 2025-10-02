import { describe, it, expect, beforeEach } from "vitest";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { EntityManager } from "../src/core/entity/EntityManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import { Bus } from "../src/core/messaging/Bus";
import type { CommandMessage, OutboundEvent } from "../src/core/player/IOPlayer";
import { EvaluationPlayer } from "../src/core/player/evalplayer/EvaluationPlayer";
import { TimeComponent } from "../src/core/components/time/TimeComponent";
import { TimeSystem } from "../src/core/systems/time/TimeSystem";
import type { Frame } from "../src/core/messaging/outbound/Frame";
import type { LoopController } from "../src/core/player/Player";
import { System } from "../src/core/systems/System";

class MockLoop implements LoopController {
  #callback: (() => void) | null = null;
  #running = false;

  start(callback: () => void): void {
    this.#callback = callback;
    this.#running = true;
  }

  stop(): void {
    this.#callback = null;
    this.#running = false;
  }

  trigger(): void {
    this.#callback?.();
  }

  get running(): boolean {
    return this.#running;
  }
}

describe("EvaluationPlayer", () => {
  let components: ComponentManager;
  let entities: EntityManager;
  let systems: SystemManager;
  let inbound: Bus<CommandMessage>;
  let outbound: Bus<OutboundEvent>;
  let loop: MockLoop;
  let timeComponent: TimeComponent;
  let timeSystem: TimeSystem;
  let player: EvaluationPlayer;
  let events: OutboundEvent[];

  beforeEach(() => {
    components = new ComponentManager();
    entities = new EntityManager(components);
    systems = new SystemManager();
    inbound = new Bus();
    outbound = new Bus();
    loop = new MockLoop();
    events = [];
    outbound.subscribe((event) => events.push(event));

    timeComponent = new TimeComponent("evaluation_time");
    timeSystem = new TimeSystem(entities, components, timeComponent);
    systems.add(timeSystem);

    // Register a no-op system so system list is non-empty after load
    class NoopSystem extends System {
      update(): void {}
    }
    systems.add(new NoopSystem(entities, components));

    player = new EvaluationPlayer(entities, components, systems, loop, inbound, outbound, timeSystem, timeComponent);
  });

  it("loads a frame snapshot without advancing time", () => {
    const frame: Frame = {
      tick: 9,
      entities: [
        {
          id: 0,
          components: {
            [timeComponent.id]: { tick: 9 },
            temperature_state: { value: 21.4 },
          },
        },
      ],
    };

    player.loadFrame(frame);

    expect(loop.running).toBe(false);
    const frameEvent = events.find((event) => event.kind === "frame");
    expect(frameEvent?.kind).toBe("frame");
    expect(frameEvent && frameEvent.frame.tick).toBe(9);
    const component = components.get(timeSystem.entity, timeComponent);
    expect(component && component.tick).toBe(9);
  });
});
