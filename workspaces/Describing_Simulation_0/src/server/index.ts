import http from 'http';
import type { Router } from '../routes/router';

export interface ServerOptions {
  port: number;
  router: Router;
  host?: string;
}

export class Server {
  private readonly port: number;
  private readonly router: Router;
  private readonly host: string | undefined;
  private httpServer: http.Server | null = null;

  constructor(options: ServerOptions) {
    this.port = options.port;
    this.router = options.router;
    this.host = options.host;
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    this.httpServer = http.createServer((req, res) => {
      const handled = this.router.dispatch(req, res);
      if (!handled) {
        if (typeof res.writeHead === 'function') {
          res.writeHead(404);
        }
        if (typeof res.end === 'function') {
          res.end();
        }
      }
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(this.port, this.host, resolve);
    });
  }

  async stop(): Promise<void> {
    if (!this.httpServer) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    this.httpServer = null;
  }
}
