import { RouteResponse, Router } from "../router.js";

export const INFORMATION_ROUTE_PREFIX = "/information";
export const ROOT_INFORMATION_PATH = "/";
export const SOURCE_SPEC_PATH = `${INFORMATION_ROUTE_PREFIX}/Describing_Simulation.md`;
export const API_DOCUMENT_PATH = `${INFORMATION_ROUTE_PREFIX}/api.md`;

export interface InformationRouteDependencies {
  readonly describingSimulationPath: string;
  readonly apiDocumentPath: string;
  readonly readFile: (path: string) => Promise<string>;
  readonly metadata?: Record<string, unknown>;
}

export function registerInformationRoutes(
  router: Router,
  dependencies: InformationRouteDependencies,
): void {
  router.register({
    method: "GET",
    path: ROOT_INFORMATION_PATH,
    handler: () => ({
      status: 200,
      body: {
        segments: buildSegments(),
        metadata: dependencies.metadata ?? {},
      },
    }),
  });

  router.register({
    method: "GET",
    path: SOURCE_SPEC_PATH,
    handler: () => readDocument(dependencies, dependencies.describingSimulationPath),
  });

  router.register({
    method: "GET",
    path: API_DOCUMENT_PATH,
    handler: () => readDocument(dependencies, dependencies.apiDocumentPath),
  });
}

function buildSegments(): Array<{ path: string; description: string }> {
  return [
    {
      path: "/simulation",
      description: "Control playback, manage systems/components, and consume simulation state streams.",
    },
    {
      path: "/evaluation",
      description: "Inject evaluation frames, manage evaluation plugins, and observe evaluation streams.",
    },
    {
      path: "/codebase",
      description: "Browse project files, retrieve source snippets, and upload plugin assets.",
    },
    {
      path: API_DOCUMENT_PATH,
      description: "Reference HTTP endpoints with usage details and payload conventions.",
    },
    {
      path: SOURCE_SPEC_PATH,
      description: "Read the theory and architecture of the sim-eval environment.",
    },
    {
      path: "/health",
      description: "Check service health metadata and readiness.",
    },
    {
      path: "/status",
      description: "Inspect runtime status of simulation and evaluation players.",
    },
  ];
}

function readDocument(
  dependencies: InformationRouteDependencies,
  documentPath: string,
): Promise<RouteResponse> {
  return dependencies.readFile(documentPath)
    .then((content) => ({
      status: 200,
      body: { content },
    }))
    .catch((error: unknown) => ({
      status: 500,
      body: {
        error: error instanceof Error ? error.message : "Unable to load document",
      },
    }));
}
