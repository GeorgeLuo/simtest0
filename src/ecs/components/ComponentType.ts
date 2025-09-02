/** ComponentType primitive */

export type ComponentSchema = Record<string, unknown>;

export class ComponentType {
  static registry: Set<string> = new Set();

  name: string;
  schema: ComponentSchema;

  constructor(name: string, schema: ComponentSchema) {
    if (ComponentType.registry.has(name)) {
      throw new Error('ComponentType name must be unique');
    }
    this.name = name;
    this.schema = schema;
    ComponentType.registry.add(name);
  }
}
