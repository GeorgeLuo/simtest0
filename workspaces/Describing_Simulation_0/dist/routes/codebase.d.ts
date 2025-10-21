import { Router } from "./router.js";
export declare const CODEBASE_ROUTE_PREFIX = "/codebase";
export declare const CODEBASE_TREE_PATH = "/codebase/tree";
export declare const CODEBASE_FILE_PATH = "/codebase/file";
export declare const CODEBASE_PLUGIN_PATH = "/codebase/plugin";
export interface CodebaseRouteDependencies {
    readonly rootDirectory: string;
    readonly pluginDirectory: string;
    readonly fs: {
        readFile(path: string, encoding: BufferEncoding): Promise<string>;
        writeFile(path: string, data: string): Promise<void>;
        mkdir(path: string, options?: {
            recursive?: boolean;
        }): Promise<void>;
        readdir(path: string, options: {
            withFileTypes: true;
        }): Promise<Array<{
            name: string;
            isDirectory(): boolean;
            isFile(): boolean;
        }>>;
        stat(path: string): Promise<{
            isDirectory(): boolean;
            isFile(): boolean;
        }>;
    };
    readonly path: {
        resolve(...segments: string[]): string;
        join(...segments: string[]): string;
        normalize(path: string): string;
    };
}
export declare function registerCodebaseRoutes(router: Router, dependencies: CodebaseRouteDependencies): void;
