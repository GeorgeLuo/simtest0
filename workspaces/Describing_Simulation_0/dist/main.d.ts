import { Server, ServerConfig } from "./server/Server.js";
export declare const createServer: (configOverrides?: Partial<ServerConfig>) => Server;
export declare function main(): Promise<void>;
