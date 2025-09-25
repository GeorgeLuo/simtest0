/**
 * Base simulation player responsible for controlling the lifecycle of a simulation loop.
 * The concrete implementation will compose entity, component, and system managers.
 */
export class Player {
  start(): void {
    throw new Error('Player.start is not implemented yet.');
  }

  pause(): void {
    throw new Error('Player.pause is not implemented yet.');
  }

  stop(): void {
    throw new Error('Player.stop is not implemented yet.');
  }
}
