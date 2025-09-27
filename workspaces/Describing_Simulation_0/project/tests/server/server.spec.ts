import http from 'http';
import { Bus, acknowledge } from 'src/core/messaging';
import type { SimulationPlayerCommandTypes } from 'src/core/simplayer/SimulationPlayer';
import { System } from 'src/core/systems/System';
import { createServer, type SimulationServer } from 'src/server';
import type { SimulationSystemUploadHandler } from 'src/server';

interface TestServerOptions {
  readonly systemUpload?: SimulationSystemUploadHandler;
}

interface TestServerContext {
  readonly server: SimulationServer;
  readonly simulationInbound: Bus;
  readonly simulationOutbound: Bus;
  readonly evaluationInbound: Bus;
  readonly evaluationOutbound: Bus;
  readonly simulationCommands: SimulationPlayerCommandTypes;
  readonly simulationPlayer: {
    start: jest.Mock;
    resume: jest.Mock;
    pause: jest.Mock;
    stop: jest.Mock;
  };
  readonly evaluationPlayer: {
    start: jest.Mock;
    stop: jest.Mock;
  };
}

function createTestServer(options: TestServerOptions = {}): TestServerContext {
  const simulationInbound = new Bus();
  const simulationOutbound = new Bus();
  const evaluationInbound = new Bus();
  const evaluationOutbound = new Bus();

  const simulationCommands: SimulationPlayerCommandTypes = {
    start: 'simulation/start',
    pause: 'simulation/pause',
    stop: 'simulation/stop',
    injectSystem: 'simulation/system.inject',
    ejectSystem: 'simulation/system.eject',
  };

  const simulationPlayer = {
    start: jest.fn(),
    resume: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    commands: simulationCommands,
  };

  const evaluationPlayer = {
    start: jest.fn(),
    stop: jest.fn(),
  };

  simulationInbound.subscribe(simulationCommands.start, () => {
    simulationPlayer.start();
    simulationPlayer.resume();
    return acknowledge();
  });

  simulationInbound.subscribe(simulationCommands.pause, () => {
    simulationPlayer.pause();
    return acknowledge();
  });

  simulationInbound.subscribe(simulationCommands.stop, () => {
    simulationPlayer.stop();
    return acknowledge();
  });

  simulationInbound.subscribe(simulationCommands.injectSystem, () => acknowledge());

  const server = createServer({
    simulation: {
      player: simulationPlayer,
      inbound: simulationInbound,
      outbound: simulationOutbound,
    },
    evaluation: {
      player: evaluationPlayer,
      inbound: evaluationInbound,
      outbound: evaluationOutbound,
    },
    systemUpload: options.systemUpload,
  });

  return {
    server,
    simulationInbound,
    simulationOutbound,
    evaluationInbound,
    evaluationOutbound,
    simulationCommands,
    simulationPlayer,
    evaluationPlayer,
  };
}

async function requestJson(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; payload: unknown }> {
  const payload = body ? JSON.stringify(body) : undefined;

  return await new Promise<{ status: number; payload: unknown }>((resolve, reject) => {
    const request = http.request(
      {
        method,
        port,
        path,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8') || 'null';

          try {
            resolve({
              status: response.statusCode ?? 0,
              payload: JSON.parse(text),
            });
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on('error', reject);

    if (payload) {
      request.write(payload);
    }

    request.end();
  });
}

function connectSse(port: number, path: string): Promise<{ close: () => void; next: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const request = http.request({ method: 'GET', port, path });

    request.on('response', (response) => {
      response.setEncoding('utf8');

      let resolver: ((value: string) => void) | null = null;
      const buffer: string[] = [];

      const flush = (chunk: string) => {
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (!line.includes('data:')) {
            continue;
          }

          const data = line.slice(line.indexOf('data:') + 5).trim();
          if (resolver) {
            resolver(data);
            resolver = null;
          } else {
            buffer.push(data);
          }
        }
      };

      response.on('data', (chunk: string) => {
        flush(chunk);
      });

      resolve({
        close: () => {
          request.destroy();
        },
        next: () =>
          new Promise<string>((nextResolve) => {
            const existing = buffer.shift();
            if (existing) {
              nextResolve(existing);
              return;
            }

            resolver = nextResolve;
          }),
      });
    });

    request.on('error', reject);
    request.end();
  });
}

describe('server', () => {
  jest.setTimeout(15000);

  it('starts players and exposes lifecycle info', async () => {
    const context = createTestServer();
    const port = await context.server.listen(0);

    expect(context.simulationPlayer.start).toHaveBeenCalled();
    expect(context.evaluationPlayer.start).toHaveBeenCalled();

    const info = await requestJson(port, 'GET', '/info');

    expect(info.status).toBe(200);
    expect(info.payload).toEqual({
      simulation: { state: 'running' },
      evaluation: { state: 'running' },
    });

    await context.server.close();
  });

  it('handles playback commands via HTTP', async () => {
    const context = createTestServer();
    const port = await context.server.listen(0);

    const pause = await requestJson(port, 'POST', '/simulation/playback', {
      command: 'pause',
    });

    expect(pause.status).toBe(200);
    expect(context.simulationPlayer.pause).toHaveBeenCalled();
    expect(pause.payload).toEqual({
      acknowledged: true,
      deliveries: 1,
      state: 'paused',
    });

    const info = await requestJson(port, 'GET', '/info');
    expect(info.payload).toEqual({
      simulation: { state: 'paused' },
      evaluation: { state: 'running' },
    });

    const start = await requestJson(port, 'POST', '/simulation/playback', {
      command: 'start',
    });

    expect(start.status).toBe(200);
    expect(context.simulationPlayer.resume).toHaveBeenCalled();
    expect(start.payload).toEqual({
      acknowledged: true,
      deliveries: 1,
      state: 'running',
    });

    await context.server.close();
  });

  it('streams simulation frames via server-sent events', async () => {
    const context = createTestServer();
    const port = await context.server.listen(0);

    const sse = await connectSse(port, '/simulation/stream');

    context.simulationOutbound.send('simulation/frame', { foo: 'bar' });

    const data = await sse.next();
    expect(JSON.parse(data)).toEqual({
      type: 'simulation/frame',
      payload: { foo: 'bar' },
      metadata: {},
    });

    sse.close();
    await context.server.close();
  });

  it('forwards simulation frames to the evaluation inbound bus', async () => {
    const context = createTestServer();
    const port = await context.server.listen(0);

    const received = new Promise((resolve) => {
      context.evaluationInbound.subscribe((frame) => {
        resolve(frame);
      });
    });

    context.simulationOutbound.send('simulation/frame', { tick: 1 });

    await expect(received).resolves.toMatchObject({
      type: 'simulation/frame',
      payload: { tick: 1 },
    });

    await context.server.close();
  });

  it('processes system uploads through the configured handler', async () => {
    class UploadedSystem extends System {
      // eslint-disable-next-line class-methods-use-this
      protected update(): void {}
    }
    const uploadedSystem = new UploadedSystem();
    const uploadHandler: SimulationSystemUploadHandler = jest
      .fn()
      .mockResolvedValue({ system: uploadedSystem, priority: 5 });
    const context = createTestServer({ systemUpload: uploadHandler });

    const port = await context.server.listen(0);

    const response = await requestJson(port, 'POST', '/simulation/systems', {
      module: 'test-module',
    });

    expect(response.status).toBe(201);
    expect(response.payload).toEqual({ acknowledged: true, deliveries: 1 });
    expect(uploadHandler).toHaveBeenCalled();

    await context.server.close();
  });
});
