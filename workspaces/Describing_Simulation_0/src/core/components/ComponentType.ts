/**
 * ComponentType describes the schema for a component instance. Concrete
 * component implementations should extend this interface with strongly
 * typed payloads.
 */
export interface ComponentType<TPayload> {
  /** Unique identifier for the component type at runtime. */
  readonly id: string;
  /** Human-readable description to aid discoverability. */
  readonly description?: string;
  /** Runtime guard to validate payload conformance when attaching components. */
  validate(payload: TPayload): boolean;
}

/**
 * Represents an instance of a component bound to an entity.
 */
export interface ComponentInstance<TPayload> {
  readonly type: ComponentType<TPayload>;
  readonly payload: TPayload;
}
