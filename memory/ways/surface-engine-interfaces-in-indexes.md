# Surface engine interfaces in shared indexes
- **Status:** Active
- **Created:** 2025-09-16
- **Source records:** Player and messaging index refresh (2025-09-16)
- **Last reviewed:** 2025-09-16

## Guidance
- Keep cross-cutting engine entry points such as the Player loop, IO Player, and messaging buses described in top-level indexes (`index.md` and `instruction_documents/index.md`) whenever they are introduced or changed.
- Note in change logs when messaging surfaces evolve so downstream documentation remains discoverable.

## Signals
- Introducing or modifying orchestration components that impact how contributors start, pause, stop, or observe simulations.
- Adding inbound or outbound messaging or telemetry features that require explicit mention for other contributors.

## Revision history
- 2025-09-16 — Established principle after documenting Player and messaging surfaces across indexes.
