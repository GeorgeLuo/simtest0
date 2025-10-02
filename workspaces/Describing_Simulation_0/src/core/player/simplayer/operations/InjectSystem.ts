import path from "path";
import { pathToFileURL } from "url";
import type { Operation } from "../../../messaging/inbound/Operation";
import type { CommandMessage } from "../../IOPlayer";
import type { SimulationPlayer } from "../SimulationPlayer";
import type { System } from "../../../systems/System";

export interface InjectSystemPayload {
  factory?: () => System | System[] | Promise<System | System[]>;
  modulePath?: string;
  exportName?: string;
  options?: unknown;
  position?: number;
}

export function createInjectSystemOperation(): Operation<SimulationPlayer, CommandMessage> {
  return {
    async execute(player, message) {
      if (message.type !== "inject") {
        return;
      }

      const payload = message.payload as InjectSystemPayload | undefined;
      if (!payload) {
        throw new Error("Missing payload for inject command");
      }

      if (payload.modulePath) {
        const factory = await loadModuleFactory(payload.modulePath, payload.exportName);
        const context = {
          player,
          entities: player.entityManager,
          components: player.componentManager,
          systems: player.systemManager,
        } as const;
        try {
          const produced = await factory(context, payload.options);
          return registerSystems(player, produced, payload.position);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Injection factory execution failed: ${message}`);
        }
      }

      if (payload.factory) {
        try {
          const system = await payload.factory();
          return registerSystems(player, system, payload.position);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Injection factory execution failed: ${message}`);
        }
      }

      throw new Error("Injection payload requires factory or modulePath");
    },
  };
}

type FactoryExport = (
  context: unknown,
  options?: unknown,
) => System | System[] | Promise<System | System[]>;

async function loadModuleFactory(modulePath: string, exportName?: string): Promise<FactoryExport> {
  const resolvedPath = path.isAbsolute(modulePath) ? modulePath : path.resolve(process.cwd(), modulePath);
  const moduleHref = pathToFileURL(resolvedPath).href;
  let imported: Record<string, unknown>;
  try {
    imported = await import(moduleHref);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load injection module '${resolvedPath}': ${message}`);
  }

  const candidate =
    (exportName ? imported[exportName] : undefined) ?? imported.default ?? imported.factory ?? imported.create ?? imported.createSystems;

  if (typeof candidate !== "function") {
    const label = exportName ?? "default";
    throw new Error(`Injection module '${resolvedPath}' missing callable export '${label}'`);
  }

  return candidate as FactoryExport;
}

async function registerSystems(
  player: SimulationPlayer,
  produced: System | System[] | Promise<System | System[]>,
  position?: number,
): Promise<System | System[]> {
  const systems = await produced;
  try {
    if (Array.isArray(systems)) {
      systems.forEach((system, index) => {
        player.addSystem(system, position !== undefined ? position + index : undefined);
      });
      return systems;
    }

    player.addSystem(systems, position);
    return systems;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Registering systems failed: ${message}`);
  }
}
