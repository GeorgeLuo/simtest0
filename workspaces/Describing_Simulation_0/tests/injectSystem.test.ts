import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import path from "path";
import { tmpdir } from "os";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { ComponentManager } from "../src/core/components/ComponentManager";
import { EntityManager } from "../src/core/entity/EntityManager";
import { SystemManager } from "../src/core/systems/management/SystemManager";
import { Bus } from "../src/core/messaging/Bus";
import { SimulationPlayer } from "../src/core/player/simplayer/SimulationPlayer";
import type { CommandMessage } from "../src/core/player/IOPlayer";
import { createInjectSystemOperation } from "../src/core/player/simplayer/operations/InjectSystem";

class MockLoop {
  #callback: (() => void) | null = null;

  start(callback: () => void): void {
    this.#callback = callback;
  }

  stop(): void {
    this.#callback = null;
  }

  trigger(times = 1): void {
    for (let i = 0; i < times; i += 1) {
      this.#callback?.();
    }
  }
}

const workspaceDir = path.resolve(__dirname, "..");

const normalizePath = (value: string) => value.replace(/\\/g, "/");

async function writeModule(tempDir: string, name: string, contents: string): Promise<string> {
  const filePath = path.join(tempDir, `${name}.ts`);
  await writeFile(filePath, contents, "utf-8");
  return filePath;
}

describe("injectSystem operation", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "inject-system-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  let components: ComponentManager;
  let entities: EntityManager;
  let systems: SystemManager;
  let inbound: Bus<CommandMessage>;
  let outbound: Bus<unknown>;
  let loop: MockLoop;
  let player: SimulationPlayer;
  const injectSystem = createInjectSystemOperation();

  beforeEach(() => {
    components = new ComponentManager();
    entities = new EntityManager(components);
    systems = new SystemManager();
    inbound = new Bus();
    outbound = new Bus();
    loop = new MockLoop();
    player = new SimulationPlayer(entities, components, systems, loop, inbound, outbound as Bus<any>);
  });

  it("injects systems from a module path", async () => {
    const systemImport = normalizePath(path.join(workspaceDir, "src/core/systems/System.ts"));
    const entityImport = normalizePath(path.join(workspaceDir, "src/core/entity/EntityManager.ts"));
    const componentImport = normalizePath(path.join(workspaceDir, "src/core/components/ComponentManager.ts"));

    const modulePath = await writeModule(
      tempDir,
      `success-${Date.now()}`,
      `import { System } from "${systemImport}";
import type { EntityManager } from "${entityImport}";
import type { ComponentManager } from "${componentImport}";

class ProbeSystem extends System {
  constructor(entities: EntityManager, components: ComponentManager) {
    super(entities, components);
  }

  override update(): void {}
}

export function createTemperatureControlSystems({ entities, components }: { entities: EntityManager; components: ComponentManager }) {
  return [new ProbeSystem(entities, components)];
}
`,
    );

    const result = await injectSystem.execute(player, {
      id: "inject-success",
      type: "inject",
      payload: {
        modulePath,
        exportName: "createTemperatureControlSystems",
      },
    });

    expect(Array.isArray(result)).toBe(true);
    expect(player.listSystems().length).toBeGreaterThan(0);
  });

  it("propagates factory failures", async () => {
    const modulePath = await writeModule(
      tempDir,
      `factory-error-${Date.now()}`,
      `export function createTemperatureControlSystems() {
  throw new Error("boom");
}
`,
    );

    await expect(
      injectSystem.execute(player, {
        id: "inject-error",
        type: "inject",
        payload: {
          modulePath,
          exportName: "createTemperatureControlSystems",
        },
      }),
    ).rejects.toThrow(/factory execution failed/i);
  });

  it("rejects when module is missing the requested export", async () => {
    const modulePath = await writeModule(
      tempDir,
      `missing-export-${Date.now()}`,
      `export const noop = () => [];
`,
    );

    await expect(
      injectSystem.execute(player, {
        id: "inject-missing",
        type: "inject",
        payload: {
          modulePath,
          exportName: "createTemperatureControlSystems",
        },
      }),
    ).rejects.toThrow(/missing callable export/i);
  });

  it("fails when the module cannot be resolved", async () => {
    await expect(
      injectSystem.execute(player, {
        id: "inject-missing-module",
        type: "inject",
        payload: {
          modulePath: path.join(tempDir, "not-real.ts"),
          exportName: "createTemperatureControlSystems",
        },
      }),
    ).rejects.toThrow(/Failed to load injection module/i);
  });
});
