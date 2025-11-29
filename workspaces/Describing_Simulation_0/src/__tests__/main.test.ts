import { start } from '../main';
import { createServer } from '../server';
import type { Server } from '../server';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

jest.mock('../server', () => ({
  createServer: jest.fn(),
}));

const mockedCreateServer = createServer as jest.MockedFunction<typeof createServer>;

describe('main start()', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PORT;
    delete process.env.SIMEVAL_PORT;
    jest.useRealTimers();
  });

  it('creates the server, starts it, and logs address', async () => {
    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();

    mockedCreateServer.mockReturnValue(serverMock);

    const result = await start({
      port: 4100,
      host: '0.0.0.0',
      rootDir: '/tmp/root',
      instructionDir: path.join(__dirname, '..', '..', 'instruction_documents'),
      log,
      autoStartEvaluation: false,
    });

    expect(mockedCreateServer).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 4100,
        host: '0.0.0.0',
        simulation: expect.objectContaining({
          player: expect.any(Object),
          outboundBus: expect.any(Object),
          loadSystem: expect.any(Function),
        }),
        evaluation: expect.objectContaining({
          player: expect.any(Object),
          outboundBus: expect.any(Object),
          loadSystem: expect.any(Function),
          loadComponent: expect.any(Function),
        }),
        codebase: expect.objectContaining({
          rootDir: '/tmp/root',
          listDir: expect.any(Function),
          readFile: expect.any(Function),
        }),
        information: expect.objectContaining({
          segments: expect.any(Array),
          documents: expect.any(Array),
          readDocument: expect.any(Function),
        }),
      }),
    );
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('SimEval server listening on http://0.0.0.0:4100');
    expect(result).toBe(serverMock);
  });

  it('derives port from environment variables when not provided', async () => {
    process.env.PORT = '5123';
    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();

    mockedCreateServer.mockReturnValue(serverMock);

    await start({ log, autoStartEvaluation: false });

    expect(mockedCreateServer).toHaveBeenCalledWith(expect.objectContaining({ port: 5123 }));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('5123'));
  });

  it('passes cycle interval override to simulation and evaluation players', async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();
    mockedCreateServer.mockReturnValue(serverMock);

    await start({ log, cycleIntervalMs: 5, autoStartEvaluation: false });

    const serverArgs = mockedCreateServer.mock.calls[0]?.[0];
    expect(serverArgs).toBeDefined();

    const simulationPlayer = serverArgs?.simulation.player;
    const evaluationPlayer = serverArgs?.evaluation.player;
    expect(simulationPlayer).toBeDefined();
    expect(evaluationPlayer).toBeDefined();

    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    simulationPlayer.start();
    evaluationPlayer.start();

    const invokedDelays = setIntervalSpy.mock.calls.map((call) => call[1]);
    expect(invokedDelays.filter((delay) => delay === 5).length).toBeGreaterThanOrEqual(2);

    simulationPlayer.stop();
    evaluationPlayer.stop();

    setIntervalSpy.mockRestore();
  });

  it('pipes simulation frames through the evaluation inbound bus', async () => {
    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();
    const outboundMessages: unknown[] = [];
    let capturedOptions: any;

    mockedCreateServer.mockImplementationOnce((options) => {
      capturedOptions = options;
      const evaluationOutboundBus = options.evaluation.outboundBus as {
        subscribe: (callback: (message: unknown) => void) => void;
      };
      evaluationOutboundBus.subscribe((message: unknown) => {
        outboundMessages.push(message);
      });
      return serverMock;
    });

    await start({ log, autoStartEvaluation: false });

    const frame = { tick: 7, entities: { foo: {} } };
    capturedOptions.simulation.outboundBus.publish(frame);

    const hasAcknowledgement = outboundMessages.some(
      (message) =>
        message &&
        typeof message === 'object' &&
        'status' in (message as { status?: unknown }) &&
        (message as { status?: unknown }).status === 'success',
    );
    const hasFrame = outboundMessages.some(
      (message) => message && typeof message === 'object' && 'tick' in (message as { tick?: unknown }),
    );

    expect(hasAcknowledgement).toBe(true);
    expect(hasFrame).toBe(true);

    const evaluationContext = (capturedOptions.evaluation.player as unknown as { getContext(): unknown }).getContext() as {
      entityManager: { list(): unknown[] };
    };
    expect(evaluationContext.entityManager.list()).toHaveLength(1);

    (capturedOptions.evaluation.player as { stop(): void }).stop();
    (capturedOptions.simulation.player as { stop(): void }).stop();
  });

  it('rejects systems that fail validation against SystemContext', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'simeval-invalid-'));
    const badModulePath = path.join(tempDir, 'bad.js');

    await fs.writeFile(
      badModulePath,
      `
      class BadSystem {
        update(world) {
          return world.entities.has('x');
        }
      }
      module.exports = BadSystem;
      `,
      'utf8',
    );

    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();
    let capturedOptions: any;

    mockedCreateServer.mockImplementationOnce((options) => {
      capturedOptions = options;
      return serverMock;
    });

    await start({
      rootDir: tempDir,
      instructionDir: path.join(__dirname, '..', '..', 'instruction_documents'),
      log,
      autoStartEvaluation: false,
    });

    await expect(capturedOptions.simulation.loadSystem({ modulePath: 'bad.js' })).rejects.toThrow(
      /System validation failed/,
    );

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
