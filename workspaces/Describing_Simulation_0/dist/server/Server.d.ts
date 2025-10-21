import { EvaluationPlayer } from "../core/evalplayer/EvaluationPlayer.js";
import { SimulationPlayer } from "../core/simplayer/SimulationPlayer.js";
import { Router } from "../routes/router.js";
export interface ServerConfig {
    readonly port: number;
    readonly host?: string;
}
export interface ServerDependencies {
    readonly simulationPlayer: SimulationPlayer;
    readonly evaluationPlayer: EvaluationPlayer;
    readonly router: Router;
    readonly cleanup?: () => void;
}
export declare class Server {
    private readonly config;
    private readonly simulationPlayer;
    private readonly evaluationPlayer;
    private readonly router;
    private readonly cleanup?;
    private httpServer;
    private listening;
    constructor(config: ServerConfig, dependencies: ServerDependencies);
    start(): Promise<void>;
    stop(): Promise<void>;
    getConfig(): ServerConfig;
    getRouter(): Router;
    getSimulationPlayer(): SimulationPlayer;
    getEvaluationPlayer(): EvaluationPlayer;
}
