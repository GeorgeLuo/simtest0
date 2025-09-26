import { ComponentType } from '../../components/ComponentType';
import type { ComponentManager } from '../../components/ComponentManager';
import type { EntityManager } from '../../entity/EntityManager';
import { acknowledge, noAcknowledgement } from '../../messaging/outbound/Acknowledgement';
import type { Frame } from '../../messaging/outbound/Frame';
import { matchType } from '../../messaging/outbound/FrameFilter';
import type { Operation } from '../../messaging/inbound/Operation';

export interface InjectFrameEntityPayload {
  readonly id: string;
  readonly components?: Record<string, unknown>;
}

export interface InjectFramePayload {
  readonly entities: InjectFrameEntityPayload[];
}

export type InjectFrameFrame = Frame<InjectFramePayload>;

export interface InjectFrameOperationOptions {
  readonly messageType?: string;
  readonly onInjected?: (frame: InjectFrameFrame) => void;
}

const DEFAULT_MESSAGE_TYPE = 'simulation/frame';
const OPERATION_ID = 'evaluation.inject-frame';

export function createInjectFrameOperation(
  entities: EntityManager,
  components: ComponentManager,
  options: InjectFrameOperationOptions = {},
): Operation {
  const messageType = options.messageType ?? DEFAULT_MESSAGE_TYPE;
  const componentCache = new Map<string, ComponentType<unknown>>();

  const resolveComponentType = (name: string): ComponentType<unknown> => {
    const cached = componentCache.get(name);
    if (cached) {
      return cached;
    }

    for (const registered of components.registeredTypes()) {
      if (registered.name === name) {
        componentCache.set(name, registered);
        return registered;
      }
    }

    if (components.isRegistered(name)) {
      throw new Error(`Component type "${name}" could not be resolved.`);
    }

    const created = new ComponentType<unknown>(name);
    components.register(created);
    componentCache.set(name, created);
    return created;
  };

  return {
    id: OPERATION_ID,
    filter: matchType(messageType),
    handle: (incomingFrame) => {
      const frame = incomingFrame as InjectFrameFrame;
      const payload = frame.payload;

      if (!payload || !Array.isArray(payload.entities)) {
        return noAcknowledgement();
      }

      const normalizedEntities = new Map<string, Map<string, unknown>>();

      for (const entity of payload.entities) {
        if (!entity || typeof entity.id !== 'string' || entity.id.trim() === '') {
          return noAcknowledgement();
        }

        if (normalizedEntities.has(entity.id)) {
          return noAcknowledgement();
        }

        const componentRecord = entity.components ?? {};
        if (
          componentRecord === null ||
          typeof componentRecord !== 'object' ||
          Array.isArray(componentRecord)
        ) {
          return noAcknowledgement();
        }

        const componentMap = new Map<string, unknown>();
        for (const [componentName, value] of Object.entries(componentRecord)) {
          if (!componentName) {
            return noAcknowledgement();
          }

          componentMap.set(componentName, value);
        }

        normalizedEntities.set(entity.id, componentMap);
      }

      const nextEntityIds = new Set(normalizedEntities.keys());

      for (const existing of entities.list()) {
        if (!nextEntityIds.has(existing.id)) {
          entities.remove(existing.id);
        }
      }

      for (const [entityId, componentMap] of normalizedEntities) {
        if (!entities.has(entityId)) {
          entities.create(entityId);
        }

        const seenComponentNames = new Set<string>();

        for (const [componentName, value] of componentMap) {
          const type = resolveComponentType(componentName);
          components.setComponent(entityId, type, value);
          seenComponentNames.add(componentName);
        }

        const existingComponents = components.getComponentsForEntity(entityId);
        for (const type of existingComponents.keys()) {
          if (!seenComponentNames.has(type.name)) {
            components.removeComponent(entityId, type);
          }
        }
      }

      options.onInjected?.(frame);

      return acknowledge();
    },
  };
}
