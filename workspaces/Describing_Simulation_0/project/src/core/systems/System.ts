/**
 * Base class for simulation systems exposing a simple lifecycle contract.
 */
export abstract class System {
  private initialized = false;
  private destroyed = false;

  /**
   * Prepares the system for execution. The initialization hook is executed only once.
   */
  init(): void {
    if (this.destroyed) {
      throw new Error('Cannot initialize a system that has been destroyed.');
    }

    if (!this.initialized) {
      this.initialized = true;
      this.onInit();
    }
  }

  /**
   * Executes one update tick, ensuring the system has been initialized and not yet destroyed.
   */
  tick(deltaTime: number): void {
    if (!this.initialized) {
      this.init();
    }

    if (this.destroyed) {
      throw new Error('Cannot update a system that has been destroyed.');
    }

    this.update(deltaTime);
  }

  /**
   * Tears the system down, invoking the teardown hook once.
   */
  destroy(): void {
    if (!this.initialized || this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.onDestroy();
  }

  /** Lifecycle hook for subclasses to override during initialization. */
  protected onInit(): void {}

  /** Lifecycle hook for subclasses to override during teardown. */
  protected onDestroy(): void {}

  /** Subclasses implement their execution logic here. */
  protected abstract update(deltaTime: number): void;
}
