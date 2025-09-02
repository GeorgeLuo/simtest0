/** ComponentType primitive */

class ComponentType {
  constructor(name, schema) {
    if (ComponentType.registry.has(name)) {
      throw new Error('ComponentType name must be unique');
    }
    this.name = name;
    this.schema = schema;
    ComponentType.registry.add(name);
  }
}

ComponentType.registry = new Set();

module.exports = { ComponentType };
