# Manual Player Usage Assumption

- Deterministic offline simulations should instantiate `ManualPlayer` to expose explicit `step()` and `snapshot()` controls instead of relying on timed loops. This keeps artifact generation reproducible and avoids flakiness from asynchronous timers.
- Scenario builders are expected to wire systems onto the manual player in the order they should execute each tick, ensuring time progression happens before environment and control systems.
