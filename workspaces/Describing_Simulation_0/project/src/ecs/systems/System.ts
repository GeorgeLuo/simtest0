// Defines the contract for systems that participate in the ECS update loop.
// Systems are executed sequentially by the SystemManager and may opt into
// lifecycle hooks for setup and teardown.
export type SystemLifecycleContext = {
  // The total amount of simulated time that has elapsed in seconds.
  elapsedTime: number;
};

export type SystemUpdateContext = SystemLifecycleContext & {
  // The amount of simulated time that has progressed since the previous
  // update call in seconds.
  deltaTime: number;
};

export interface System {
  // A unique identifier for the system within a SystemManager instance.
  readonly id: string;

  // Optional hook invoked before the update loop begins.
  initialize?(context: SystemLifecycleContext): void | Promise<void>;

  // Called every frame to advance the simulation.
  update(context: SystemUpdateContext): void | Promise<void>;

  // Optional hook invoked when the system is being removed or when the
  // SystemManager is shutting down.
  shutdown?(context: SystemLifecycleContext): void | Promise<void>;
}
