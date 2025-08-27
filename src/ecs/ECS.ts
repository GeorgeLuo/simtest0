import { EntityManager } from './entity/EntityManager';
import { ComponentManager } from './components/ComponentManager';

export interface System {
  update(delta: number): void;
}

export class ECS {
  readonly entities = new EntityManager();
  readonly components = new ComponentManager();
  private systems: System[] = [];
  private running = false;

  addSystem(system: System): void {
    this.systems.push(system);
  }

  removeSystem(system: System): void {
    this.systems = this.systems.filter(s => s !== system);
  }

  update(delta: number): void {
    for (const system of this.systems) {
      system.update(delta);
    }
  }

  run(tick = 16): void {
    this.running = true;
    const step = () => {
      if (!this.running) return;
      this.update(tick);
      setTimeout(step, tick);
    };
    step();
  }

  stop(): void {
    this.running = false;
  }
}

export default ECS;
