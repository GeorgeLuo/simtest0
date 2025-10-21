# Describing Simulation

> Synthesized from `instruction_documents/Describing_Simulation_0_codifying_simulations.md`,
> `instruction_documents/Describing_Simulation_0_theory.md`, and the staged
> checkpoints under Phase 2 of the schedule of work.

The Sim-Eval project defines an agent-oriented methodology for turning natural
language hypotheticals into executable simulations. This document summarises the
core architecture, runtime players, and operational surface that together enable
interactive simulation and evaluation.

## 1. Problem Framing

- **Comparative temporality:** Prompts explore how an environment evolves across
  discrete ticks, so the engine models state at each step.
- **Endogeneity:** Systems that drive change operate within the environment; the
  simulation does not rely on external omniscient forces.
- **Relational conditionality:** Entities interact through components and
  systems, allowing cause-and-effect reasoning to be captured explicitly.

The methodology translates prompts into intent-complete specifications, then
codifies those specs using a staged workflow (skeletons → test intents → tests →
implementation → validation).

## 2. Core Primitives

### 2.1 Entity
Represents an addressable unit in the world. An entity is an ID with an
associated set of components. Entities are created and managed through the
`EntityManager`, which ensures that component attachments stay consistent.

### 2.2 ComponentType & ComponentManager
Components hold structured data (state, configuration, signals). `ComponentType`
derives schemas and default values, while `ComponentManager` attaches component
instances to entities and provides query/update operations.

### 2.3 System & SystemManager
Systems implement behaviour that runs on each tick. They receive access to the
entity/component infrastructure and may emit outbound frames. `SystemManager`
registers systems, defines execution order, and invokes lifecycle hooks
(`onInit`, `update`, `onDestroy`).

### 2.4 Time
The `TimeComponent` captures tick metadata and the `TimeSystem` increments the
global tick, ensuring deterministic progression of the simulation loop.

## 3. Messaging Model

- **Inbound bus:** Receives control operations (`simulation.start`,
  `evaluation.frame`, etc.). Handlers transform these operations into player
  actions, allowing HTTP routes, CLI tools, or other transports to share the
  same inbound vocabulary.
- **Outbound bus:** Broadcasts acknowledgements and frames. Frame messages feed
  the SSE endpoints; acknowledgement messages confirm whether a requested
  mutation succeeded.
- **Acknowledgements:** Every control message yields an acknowledgement object
  containing a `messageId`, `status`, and optional `detail` field. Routes map
  `status: success` to HTTP 200 and `status: error` to HTTP 500.

This publish/subscribe pattern decouples transport code from player logic and
ensures alignment with future automation channels.

## 4. Runtime Players

### 4.1 Simulation Player

- Hosts the primary environment.
- Registers default systems (including `TimeSystem`) and components.
- Consumes inbound lifecycle messages (`simulation.start`, `pause`, `stop`) and
  dynamic content operations (`simulation.system.inject`, etc.).
- Publishes frames representing the full environment snapshot each tick.

### 4.2 Evaluation Player

- Provides a sandbox for analysing recorded frames.
- Receives injected systems/components tailored to evaluation (e.g., detectors,
  metrics aggregators).
- Accepts frames through `evaluation.frame` messages; frames can originate from
  the simulation loop or data stores.
- Streams processed frames and acknowledgements back to observers.

### 4.3 Frame Bridging

`main.ts` wires a bridge that forwards simulation frames to the evaluation
player by emitting `evaluation.frame` messages. This default bridge can be
augmented or replaced by bespoke evaluation workflows.

## 5. Server Composition

The HTTP server (`Server.ts`) wraps Node’s `http` module. It:

1. Builds Simulation and Evaluation players, each with their own inbound and
   outbound buses.
2. Registers route modules that expose the API surface.
3. Manages lifecycle hooks (`start`, `stop`, `dispose`) so tests and tools can
   spin the service up and down deterministically.

### 5.1 Router

The router supports method/path matching, parameter extraction, JSON body
parsing, and default JSON responses. It keeps route definitions immutable, which
enables tests to assert the registered surface.

### 5.2 Information Routes

- `/` emits a discoverability payload describing the major route families.
- `/information/Describing_Simulation.md` and `/information/api.md` serve the
  markdown files found in `src/routes/information/`.

### 5.3 Simulation & Evaluation Routes

- Lifecycle commands publish inbound messages and await acknowledgements.
- System/component routes manipulate registries on the respective players.
- Streaming routes (`/simulation/stream`, `/evaluation/stream`) convert outbound
  frames into Server-Sent Events with keep-alive heartbeats.

### 5.4 Codebase Routes

These routes let operators inspect and extend the runtime codebase:

- `GET /codebase/tree` recursively enumerates the repository.
- `GET /codebase/file` returns file contents after validating relative paths.
- `POST /codebase/plugin` installs plugins into `plugins/`, creating directories
  on demand while preventing directory traversal.

### 5.5 System Routes

- `GET /health` returns route metadata plus a timestamp.
- `GET /status` reports whether each player is running and the current tick.

## 6. Plugin Layout

The runtime separates built-in simulation logic from user-defined plugins:

```
plugins/
  simulation/
    components/
    systems/
    operations/
  evaluation/
    components/
    systems/
    operations/
```

Plugins uploaded through the API should adhere to this structure. The evaluation
plugins can differ from simulation plugins, enabling tailored analytics.

## 7. Development Workflow

1. **Skeletons:** Create module shells that align with the instruction set.
2. **Test intents:** Document behavioural expectations using comment-only tests.
3. **Tests:** Convert intents into executable Vitest suites.
4. **Implementation:** Fill in the skeletons to satisfy tests, respecting the
   messaging contracts above.
5. **Validation:** Run `npm test` (and eventually the integration harness) on a
   clean build.
6. **Integration:** Execute `tools/run_integration.sh` to simulate first-time
   usage, including plugin uploads and SSE verification.

This discipline prevents large leaps of logic and ensures the spec remains a
living document throughout implementation.

## 8. Integration Stages

The integration script performs six stages:

1. Build the TypeScript bundle and start the service.
2. Query informational endpoints to confirm documentation coverage.
3. Capture `/status` before the simulation starts (should report idle players).
4. Upload exemplar plugins to the runtime directory.
5. Start the simulation and confirm acknowledgement success.
6. Inject an evaluation frame and confirm that the SSE stream emits data.

Resulting artifacts are stored under `verifications/` with timestamped
directories, providing evidence for manual and automated auditors.

## 9. Glossary

- **Frame:** A serialized snapshot of entities, components, and derived state at
  a given tick.
- **Acknowledgement:** Message confirming success or failure of an inbound
  operation.
- **Inbound Handler Registry:** Registry that maps inbound message types to
  handlers on a player.
- **Player:** A runtime orchestrator (`SimulationPlayer`, `EvaluationPlayer`)
  that processes inbound messages and produces outbound frames.

## 10. Further Reading

- `instruction_documents/Describing_Simulation_0_theory.md` — foundational
  concepts driving the simulation methodology.
- `instruction_documents/Describing_Simulation_0_codifying_simulations.md` —
  step-by-step instructions for building the sim-eval server.
- `instruction_documents/Describing_Simulation_0_api_map.md` — enumerated API
  reference mirrored by `/information/api.md`.

Maintaining parity between these instructions and the runtime artifacts is a
Phase 4 alignment goal. Any deviations should be recorded in `memory/exceptions/`.
