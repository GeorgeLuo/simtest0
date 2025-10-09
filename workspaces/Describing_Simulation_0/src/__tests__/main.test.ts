import type { Server } from '../server';
import { start } from '../main';
import { createServer } from '../server/bootstrap';

jest.mock('../server/bootstrap', () => ({
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

    const result = await start({ port: 4100, host: '0.0.0.0', rootDir: '/tmp/root', log });

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

    await start({ log });

    expect(mockedCreateServer).toHaveBeenCalledWith(expect.objectContaining({ port: 5123 }));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('5123'));
  });

  it('passes cycle interval override to simulation and evaluation players', async () => {
    jest.useFakeTimers({ advanceTimers: true });

    const startMock = jest.fn().mockResolvedValue(undefined);
    const serverMock = { start: startMock } as unknown as Server;
    const log = jest.fn();
    mockedCreateServer.mockReturnValue(serverMock);

    await start({ log, cycleIntervalMs: 5 });

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
});
