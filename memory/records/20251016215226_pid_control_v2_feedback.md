# PID Control Replay v2 Feedback – 2025-10-16T21:52Z

- Reviewed `/replays/pid_control_v2` package from external tester; script now uploads a richer PID controller that posts telemetry to `/evaluation/frame` and captures both simulation and evaluation SSE streams.
- Sample run confirms simulation ticks advance and system injection succeeds, but evaluation stream output contains only `core.time` frames — no `pid` telemetry despite the plugin attempting HTTP posts.
- `/codebase/file?path=plugins/simulation/systems/pid_state.json` still returns 404, indicating the controller cannot persist state artifacts under the current plugin sandbox.
- Tester’s notes flag these gaps: evaluation API remains a black box for PID metrics and filesystem writes from plugins appear blocked. Need follow-up on telemetry ingestion and plugin persistence.
