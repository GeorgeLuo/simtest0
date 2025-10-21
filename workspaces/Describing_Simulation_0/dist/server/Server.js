import { createServer as createHttpServer } from "node:http";
export class Server {
    config;
    simulationPlayer;
    evaluationPlayer;
    router;
    cleanup;
    httpServer = null;
    listening = false;
    constructor(config, dependencies) {
        this.config = config;
        this.simulationPlayer = dependencies.simulationPlayer;
        this.evaluationPlayer = dependencies.evaluationPlayer;
        this.router = dependencies.router;
        this.cleanup = dependencies.cleanup;
    }
    async start() {
        if (this.listening) {
            return;
        }
        const listener = this.router.createListener();
        this.httpServer = createHttpServer(listener);
        await new Promise((resolve, reject) => {
            const server = this.httpServer;
            const handleError = (error) => {
                this.httpServer = null;
                reject(error);
            };
            const detachError = () => {
                const candidate = server;
                if (typeof candidate.off === "function") {
                    candidate.off("error", handleError);
                }
                else if (typeof candidate.removeListener === "function") {
                    candidate.removeListener("error", handleError);
                }
            };
            const attachError = () => {
                const candidate = server;
                if (typeof candidate.once === "function") {
                    candidate.once("error", handleError);
                }
                else if (typeof candidate.on === "function") {
                    candidate.on("error", handleError);
                }
            };
            attachError();
            const onListening = () => {
                detachError();
                this.listening = true;
                resolve();
            };
            try {
                const host = this.config.host ?? "0.0.0.0";
                server.listen(this.config.port, host, onListening);
            }
            catch (error) {
                detachError();
                handleError(error);
            }
        });
    }
    async stop() {
        if (!this.listening || !this.httpServer) {
            return;
        }
        await new Promise((resolve, reject) => {
            this.httpServer?.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.listening = false;
        this.httpServer = null;
        this.simulationPlayer.dispose();
        this.evaluationPlayer.dispose();
        this.cleanup?.();
    }
    getConfig() {
        return this.config;
    }
    getRouter() {
        return this.router;
    }
    getSimulationPlayer() {
        return this.simulationPlayer;
    }
    getEvaluationPlayer() {
        return this.evaluationPlayer;
    }
}
