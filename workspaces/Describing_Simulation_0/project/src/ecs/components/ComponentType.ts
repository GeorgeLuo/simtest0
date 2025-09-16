// Describes the metadata and construction contract for a component kind.

export type ComponentFieldDefinition<TValue> = {
  description: string;
  defaultValue: TValue;
};

export type ComponentSchema<TComponent> = {
  [K in keyof TComponent]-?: ComponentFieldDefinition<TComponent[K]>;
};

export interface ComponentTypeMetadata<TComponent> {
  id: string;
  name: string;
  description: string;
  schema: ComponentSchema<TComponent>;
  defaults: TComponent;
}

export interface ComponentTypeConfig<TComponent> {
  id: string;
  name: string;
  description: string;
  schema: ComponentSchema<TComponent>;
}

export interface ComponentType<TComponent = unknown> {
  id: string;
  metadata: ComponentTypeMetadata<TComponent>;
  create(overrides?: Partial<TComponent>): TComponent;
}

export function createComponentType<TComponent>(
  config: ComponentTypeConfig<TComponent>,
): ComponentType<TComponent> {
  const defaults = Object.keys(config.schema).reduce((accumulator, key) => {
    const typedKey = key as keyof TComponent;
    const field = config.schema[typedKey];

    accumulator[typedKey] = field.defaultValue;
    return accumulator;
  }, {} as TComponent);

  const metadata: ComponentTypeMetadata<TComponent> = {
    id: config.id,
    name: config.name,
    description: config.description,
    schema: config.schema,
    defaults,
  };

  return {
    id: config.id,
    metadata,
    create(overrides) {
      return {
        ...metadata.defaults,
        ...(overrides ?? {}),
      };
    },
  };
}
