import type { IncomingHttpHeaders } from 'http';
import type { Bus } from '../core/messaging/Bus';
import type { Acknowledgement } from '../core/messaging/outbound/Acknowledgement';
import type { SimulationPlayerCommandTypes } from '../core/simplayer/SimulationPlayer';
import type { System } from '../core/systems/System';
import { readJsonBody, readRequestBody, Router, sendJson } from './router';

export type SimulationPlaybackState = 'idle' | 'running' | 'paused';

export interface SimulationSystemUploadRequest {
  readonly rawBody: Buffer;
  readonly json?: unknown;
  readonly headers: IncomingHttpHeaders;
}

export interface SimulationSystemUploadResult {
  readonly system: System;
  readonly priority?: number;
}

export type SimulationSystemUploadHandler = (
  request: SimulationSystemUploadRequest,
) => Promise<SimulationSystemUploadResult>;

export interface SimulationRouteContext {
  readonly commandBus: Bus;
  readonly outboundBus: Bus;
  readonly commands: SimulationPlayerCommandTypes;
  readonly onStateChange?: (state: SimulationPlaybackState) => void;
  readonly systemUpload?: SimulationSystemUploadHandler;
}

interface PlaybackPayload {
  readonly command?: string;
}

function publishState(
  acknowledgement: Acknowledgement,
  nextState: SimulationPlaybackState,
  onStateChange?: (state: SimulationPlaybackState) => void,
): void {
  if (acknowledgement.acknowledged && onStateChange) {
    onStateChange(nextState);
  }
}

function mapCommand(
  command: string,
  commands: SimulationPlayerCommandTypes,
): { type: string; nextState: SimulationPlaybackState } | null {
  switch (command) {
    case 'start':
    case 'resume':
      return { type: commands.start, nextState: 'running' };
    case 'pause':
      return { type: commands.pause, nextState: 'paused' };
    case 'stop':
      return { type: commands.stop, nextState: 'idle' };
    default:
      return null;
  }
}

function establishStream(router: Router, path: string, bus: Bus): void {
  router.add('GET', path, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(': connected\n\n');

    const unsubscribe = bus.subscribe((frame) => {
      res.write(`data: ${JSON.stringify(frame)}\n\n`);
    });

    const cleanup = () => {
      unsubscribe();
      if (!res.writableEnded) {
        res.end();
      }
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
  });
}

async function handlePlayback(
  router: Router,
  context: SimulationRouteContext,
): Promise<void> {
  router.add('POST', '/simulation/playback', async (req, res) => {
    let payload: PlaybackPayload;

    try {
      payload = await readJsonBody<PlaybackPayload>(req);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON payload.' });
      return;
    }

    const command = payload.command;
    if (!command) {
      sendJson(res, 400, { error: 'Missing playback command.' });
      return;
    }

    const mapped = mapCommand(command, context.commands);
    if (!mapped) {
      sendJson(res, 400, { error: `Unsupported playback command: ${command}` });
      return;
    }

    const acknowledgement = context.commandBus.send(mapped.type, undefined);
    publishState(acknowledgement, mapped.nextState, context.onStateChange);

    sendJson(res, acknowledgement.acknowledged ? 200 : 202, {
      acknowledged: acknowledgement.acknowledged,
      deliveries: acknowledgement.deliveries,
      state: acknowledgement.acknowledged ? mapped.nextState : undefined,
    });
  });
}

function handleSystemUpload(router: Router, context: SimulationRouteContext): void {
  router.add('POST', '/simulation/systems', async (req, res) => {
    if (!context.systemUpload) {
      sendJson(res, 501, { error: 'System uploads are not supported.' });
      return;
    }

    const rawBody = await readRequestBody(req);
    let json: unknown;
    const contentType = req.headers['content-type'];

    if (contentType && contentType.includes('application/json') && rawBody.length) {
      try {
        json = JSON.parse(rawBody.toString('utf8')) as unknown;
      } catch (error) {
        sendJson(res, 400, { error: 'Invalid JSON payload.' });
        return;
      }
    }

    let result: SimulationSystemUploadResult;
    try {
      result = await context.systemUpload({
        rawBody,
        json,
        headers: req.headers,
      });
    } catch (error) {
      sendJson(res, 400, {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process system upload.',
      });
      return;
    }

    if (!result?.system) {
      sendJson(res, 400, { error: 'System upload handler did not return a system.' });
      return;
    }

    const acknowledgement = context.commandBus.send(
      context.commands.injectSystem,
      {
        system: result.system,
        priority: result.priority,
      },
    );

    sendJson(res, acknowledgement.acknowledged ? 201 : 202, {
      acknowledged: acknowledgement.acknowledged,
      deliveries: acknowledgement.deliveries,
    });
  });
}

export function registerSimulationRoutes(
  router: Router,
  context: SimulationRouteContext,
): void {
  establishStream(router, '/simulation/stream', context.outboundBus);
  handleSystemUpload(router, context);
  void handlePlayback(router, context);
}
