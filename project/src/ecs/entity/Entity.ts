export type EntityId = number;

export class Entity {
  public readonly id: EntityId;

  constructor(id: EntityId) {
    this.id = id;
  }
}
