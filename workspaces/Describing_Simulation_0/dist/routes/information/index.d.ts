import { Router } from "../router.js";
export declare const INFORMATION_ROUTE_PREFIX = "/information";
export declare const ROOT_INFORMATION_PATH = "/";
export declare const SOURCE_SPEC_PATH = "/information/Describing_Simulation.md";
export declare const API_DOCUMENT_PATH = "/information/api.md";
export interface InformationRouteDependencies {
    readonly describingSimulationPath: string;
    readonly apiDocumentPath: string;
    readonly readFile: (path: string) => Promise<string>;
    readonly metadata?: Record<string, unknown>;
}
export declare function registerInformationRoutes(router: Router, dependencies: InformationRouteDependencies): void;
