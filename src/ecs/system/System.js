/** System primitive with lifecycle hooks */

class System {
  init(_entityManager, _componentManager) {}

  update(_entityManager, _componentManager) {
    throw new Error(`${this.constructor.name}.update must be implemented`);
  }

  destroy(_entityManager, _componentManager) {}
}

module.exports = { System };
