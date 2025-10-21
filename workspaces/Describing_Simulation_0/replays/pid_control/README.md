# PID Control Replay Package

This bundle captures the curl workflow used to probe the Sim-Eval server’s PID control scenario and makes it easy to reproduce.

## Contents
- `replay_pid_attempt.sh` – Shell script that replays the entire interaction sequence and stores outputs.
- `sample_run/replay.log` – Captured output from running the script against the current service.

## Prerequisites
- Sim-Eval server running locally on `localhost:3000`.
- `bash` (>= 4) and `curl` available on the PATH.

## Usage
```bash
cd replays/pid_control
./replay_pid_attempt.sh            # logs to ./run-<timestamp>/
# or specify a directory
./replay_pid_attempt.sh ./my-run
```

Each run produces:
- `replay.log` with interleaved commands and responses.
- `notes.txt` summarising observed discrepancies (same content as below).

## Observed Discrepancies
1. Starting the simulation acknowledges success, yet `/status` reports `tick: 0` indefinitely.
2. Sampling `/simulation/stream` for 5 seconds yields only keep-alive comments—no `event: simulation` frames.
3. Uploading `simulation/systems/PIDControlSystem.js` succeeds, but injecting it via `POST /simulation/system` returns HTTP 500 with `No handler registered for message type 'simulation.system.inject'`.
4. The evaluation player never starts (`evaluation.running: false`), so even the default bridge produces no evaluation frames.

These issues block any attempt to run a PID control simulation through the published HTTP API.
