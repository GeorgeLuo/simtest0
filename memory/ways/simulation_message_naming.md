# Simulation Messaging Naming

- Map inbound playback control message types directly to their API counterparts: `simulation.start`, `simulation.pause`, and `simulation.stop`.
- Server routes should publish these message types onto the simulation player's inbound bus so operations and HTTP handlers stay aligned.
- Future message additions should follow the `simulation.<action>` convention to preserve discoverability and straightforward routing.
