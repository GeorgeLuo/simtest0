/**
 * Distinguishes categories of component data attached to entities.
 * Each concrete component type will provide a descriptive name and
 * a payload shape. Implementation details will follow in later stages.
 */
export class ComponentType {
    key;
    constructor(key) {
        this.key = key;
    }
}
