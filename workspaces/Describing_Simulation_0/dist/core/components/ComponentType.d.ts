/**
 * Distinguishes categories of component data attached to entities.
 * Each concrete component type will provide a descriptive name and
 * a payload shape. Implementation details will follow in later stages.
 */
export declare class ComponentType<TPayload> {
    readonly key: string;
    constructor(key: string);
}
