export class EntityManager {
  private nextId = 0;
  private entities = new Set<number>();

  createEntity(): number {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  removeEntity(id: number): void {
    this.entities.delete(id);
  }

  getAll(): Iterable<number> {
    return this.entities;
  }
}

export default EntityManager;
