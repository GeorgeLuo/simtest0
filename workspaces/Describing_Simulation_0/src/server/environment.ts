import { ComponentType } from '../core/components/ComponentType.js';
import { ComponentManager } from '../core/components/ComponentManager.js';
import { Entity } from '../core/entity/Entity.js';
import { IOPlayer } from '../core/player/IOPlayer.js';
import { EvaluationPlayer, FrameComponentType } from '../core/player/evaluation/index.js';
import { createEvaluationHandlers } from '../core/player/evaluation/operations/index.js';
import { pipeFrames } from '../core/player/integration/pipeFrames.js';
import { createPlaybackHandlers } from '../core/player/operations/index.js';
import { System } from '../core/systems/System.js';
import { TimeComponentType } from '../core/time/TimeComponent.js';
import { TimeSystem } from '../core/time/TimeSystem.js';

type DynamicData = Record<string, unknown>;

class DynamicComponentType extends ComponentType<DynamicData> {
  constructor(id: string) {
    super(id);
  }
}

class SimulationMetricSystem extends System {
  private entity: Entity | null = null;

  constructor(
    id: string,
    private readonly componentType: ComponentType<DynamicData>,
    private readonly timeSystem: TimeSystem,
    private readonly timeComponent: TimeComponentType
  ) {
    super(id);
  }

  override onInit(entityManager: IOPlayer['entityManager'], componentManager: ComponentManager): void {
    this.entity = entityManager.createEntity();
    componentManager.addComponent(this.entity, this.componentType, { tick: 0 });
  }

  override update(entityManager: IOPlayer['entityManager'], componentManager: ComponentManager): void {
    if (this.entity === null) {
      return;
    }

    const timeEntity = this.timeSystem.currentEntity;
    const timeComponent =
      timeEntity !== null ? componentManager.getComponent(timeEntity, this.timeComponent) : undefined;
    const tick = timeComponent?.data.tick ?? 0;

    const metric = componentManager.getComponent(this.entity, this.componentType);
    if (!metric) {
      componentManager.addComponent(this.entity, this.componentType, { tick });
      return;
    }

    metric.data = { tick };
  }
}

class EvaluationMetricSystem extends System {
  private entity: Entity | null = null;

  constructor(
    id: string,
    private readonly componentType: ComponentType<DynamicData>,
    private readonly frameComponent: FrameComponentType
  ) {
    super(id);
  }

  override onInit(entityManager: EvaluationPlayer['entityManager'], componentManager: ComponentManager): void {
    this.entity = entityManager.createEntity();
    componentManager.addComponent(this.entity, this.componentType, { totalFrames: 0 });
  }

  override update(entityManager: EvaluationPlayer['entityManager'], componentManager: ComponentManager): void {
    if (this.entity === null) {
      return;
    }

    const frameEntities = componentManager.getEntitiesWith(this.frameComponent);
    const totalFrames = frameEntities.length;
    const metric = componentManager.getComponent(this.entity, this.componentType);

    if (!metric) {
      componentManager.addComponent(this.entity, this.componentType, { totalFrames });
      return;
    }

    metric.data = { totalFrames };
  }
}

function ensureComponent(
  registry: Map<string, DynamicComponentType>,
  id: string
): DynamicComponentType {
  const trimmed = id?.trim?.();
  if (!trimmed) {
    throw new Error('componentId is required');
  }

  let component = registry.get(trimmed);
  if (!component) {
    component = new DynamicComponentType(trimmed);
    registry.set(trimmed, component);
  }

  return component;
}

export interface SystemRegistrationRequest {
  systemId: string;
  componentId: string;
}

export interface SimEvalEnvironment {
  simulation: IOPlayer;
  evaluation: EvaluationPlayer;
  registerSimulationSystem: (request: SystemRegistrationRequest) => { systemId: string; componentId: string };
  registerEvaluationSystem: (request: SystemRegistrationRequest) => { systemId: string; componentId: string };
  teardown: () => void;
}

export function createEnvironment(): SimEvalEnvironment {
  const simulation = new IOPlayer();
  const evaluation = new EvaluationPlayer();

  const simulationComponents = new Map<string, DynamicComponentType>();
  const evaluationComponents = new Map<string, DynamicComponentType>();

  createPlaybackHandlers(simulation);
  createEvaluationHandlers(evaluation);

  const teardownPipe = pipeFrames(simulation, evaluation);

  const registerSimulationSystem = ({ systemId, componentId }: SystemRegistrationRequest) => {
    const trimmedId = systemId?.trim?.();
    if (!trimmedId) {
      throw new Error('systemId is required');
    }

    if (simulation.systemManager.hasSystem(trimmedId)) {
      throw new Error(`System ${trimmedId} already exists`);
    }

    const component = ensureComponent(simulationComponents, componentId);
    const system = new SimulationMetricSystem(trimmedId, component, simulation.timeSystem, simulation.timeComponent);
    simulation.injectSystem(system);

    return { systemId: trimmedId, componentId: component.id };
  };

  const registerEvaluationSystem = ({ systemId, componentId }: SystemRegistrationRequest) => {
    const trimmedId = systemId?.trim?.();
    if (!trimmedId) {
      throw new Error('systemId is required');
    }

    if (evaluation.systemManager.hasSystem(trimmedId)) {
      throw new Error(`System ${trimmedId} already exists`);
    }

    const component = ensureComponent(evaluationComponents, componentId);
    const system = new EvaluationMetricSystem(trimmedId, component, evaluation.frameComponent);
    evaluation.injectSystem(system);
    evaluation.emitEvaluationFrame();

    return { systemId: trimmedId, componentId: component.id };
  };

  const teardown = () => {
    teardownPipe();
    simulation.stop();
    evaluation.stop();
    simulation.dispose?.();
    evaluation.dispose?.();
  };

  return {
    simulation,
    evaluation,
    registerSimulationSystem,
    registerEvaluationSystem,
    teardown
  };
}
