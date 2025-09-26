/**
 * Represents a uniquely identifiable simulation entity.
 */
export class Entity {
  /**
   * @param id Unique identifier assigned by the {@link EntityManager}.
   */
  constructor(public readonly id: string) {
    if (!id) {
      throw new Error('Entity id must be a non-empty string.');
    }
  }
}
