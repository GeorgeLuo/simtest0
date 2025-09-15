import { BasicTimeComponent, BasicTimeComponentState } from "../../components/implementations/BasicTimeComponent";
import { TimeComponentState } from "../../components/implementations/TimeComponent";
import { TimeSystem } from "./TimeSystem";

export interface BasicTimeSystemOptions {
  readonly component?: BasicTimeComponent;
  readonly systemId?: string;
  readonly initialState?: Partial<BasicTimeComponentState>;
}

export const BASIC_TIME_SYSTEM_ID = "core/time/basic";

/**
 * Concrete implementation of the time system that advances a time component on
 * each update cycle.
 */
export class BasicTimeSystem extends TimeSystem {
  public readonly id: string;

  private readonly component: BasicTimeComponent;
  private readonly initialState: Partial<BasicTimeComponentState>;
  private currentState: BasicTimeComponentState;

  public constructor(options: BasicTimeSystemOptions = {}) {
    super();
    this.component = options.component ?? new BasicTimeComponent();
    this.id = options.systemId ?? BASIC_TIME_SYSTEM_ID;
    this.initialState = { ...options.initialState };
    this.currentState = this.component.create(this.initialState);
  }

  public initialize(): void {
    this.currentState = this.component.create(this.initialState);
  }

  public update(deltaTime: number): void {
    this.step(deltaTime);
  }

  public shutdown(): void {
    this.currentState = this.component.create(this.initialState);
  }

  public getState(): TimeComponentState {
    return this.component.clone(this.currentState);
  }

  public step(elapsed: number): void {
    this.currentState = this.component.advance(this.currentState, elapsed);
  }
}

let activeTimeSystem: BasicTimeSystem | undefined;

/**
 * Creates a new instance of the basic time system and stores a reference for
 * shared queries.
 */
export function createBasicTimeSystem(options: BasicTimeSystemOptions = {}): BasicTimeSystem {
  const system = new BasicTimeSystem(options);
  activeTimeSystem = system;
  return system;
}

/**
 * Returns the most recent state of the globally tracked basic time system.
 */
export function getCurrentTimeState(): TimeComponentState | undefined {
  return activeTimeSystem?.getState();
}
