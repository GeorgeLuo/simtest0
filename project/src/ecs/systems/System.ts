export interface System {
  /**
   * Set up any state, entities, or components required by the system.
   */
  init(): void;

  /**
   * Execute one update tick of the system.
   */
  update(): void;

  /**
   * Clean up any resources owned by the system.
   */
  destroy(): void;
}
