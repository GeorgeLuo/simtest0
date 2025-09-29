# Checkpoint IX Simulation-Evaluation Integration

- Added integration coverage demonstrating simulation frames piping into the evaluation player via `pipeFrames`.
- Implemented the piping adapter to forward frames and acknowledgements between players.
- Adjusted players to support the integration flow (protected hooks already available).
- Full suite passes through `./checks.sh`.
