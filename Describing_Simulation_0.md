# Describing Simulation

Suppose we were to define an agent responsible for solving hypotheticals with quantitative approaches. The general strategy would be to model the relevant systems, determine the values to set in the systems, and compute the result.

This paper seeks to define an approach to build such simulations from natural language prompts, from validation to intent extraction, to codification. We define a specific methodology of building simulations for a specific problem space. The intent is not to address the universe of open-ended questions, but hopefully will address some problems worth solving.

## Summary of Assumptions

Moving forward, we will assume all problems within scope elicit **comparative temporality**, and **endogeneity** in their simulation, and have some quality of **relational conditionality**.

All problems we are willing to address compare states of environments distinct in time segments, and all parts that affect change and the effects of change as distinct bodies must exist within the environment.

To this end, we will view the input statement as mappable to a form that is intent-complete and compatible for computational simulation.

# Describing Hypotheticals

In a natural speech, hypotheticals are patterned as (**A**):

“What happens when X happens?”

This section will enumerate classifications of hypothetical statements to translate natural speech statements into actionable specs. We will progressively be developing refinements from the above, preserving and concretizing the intent.

## Endogenous or Exogenous

Naively mapping the explicit and implicit quantities in a hypothetical:

- X: an observable phenomenon in the environment

- E: the environment as a system

- Y: the change in the environment outside of the phenomenon

Another approach to framing hypotheticals might be (**B**):

“How does E change as X within the environment changes”

The difference here is **B** frames the solution as endogenous. X is part of the environment and answering the hypothetical includes describing the changes to X as the changing X ripples throughout the environment. 

In **A**, the interpretation of how to solve the prompt is exogenous, the recipient of the prompt approaches the solution with cause-and-effect framing (**A2**):

“Suppose X moves by ΔX and then remains fixed. What happens to the rest of E?”

The reason why this matters is the prompt is sent expecting an endogenous answer, but the prompt logically *may not*, while being the most natural formulation in natural speech. To simplify, we will proceed assuming the solution is always endogenous.

## Boundaries

X informs the time boundary of observation, we are observing the environment as long as X is occurring.

 The systems if bound with time (**C**):

“What was the behavior of E during T?”

- T: derived from the lifetime of the phenomenon X, a point in time distanced from T~0~ the beginning of the observation

Note the exemption of X from the prompt. X is only as useful as a proxy of time if the solution is endogenous. X is now a part of the environment.

Retaining X (**C2**):

“Given X~0~ at T~0~ what is the behavior of E as we approach X~T~?”

Implied here is a set of conditions to be fulfilled in order to conclude observation (**D**):

“What is the behavior of E until C is fulfilled?”

- C: a set of conditions described with signals of the environment

This distinction is useful when X~T~ is ambiguous in cases where a number of events are the condition for bounding the hypothetical. Radically, we’ve included T as part of the environment.

### Temporality

Let’s reword form A slightly (**A2**):

“What happens *while* X happens?”

The cascading change to form D (**D2**):

“What is the behavior of E *while C is unfilled*?”

The slight difference in logical space is A2 and D2 may not have a definitive end point. Practically, the intent is the same. The intent is always to compare the environment through the period when C is unfulfilled, and then through when the period has ended.

This introduces another point on temporality; if the intent of hypotheticals is to note contrast in the environment due to a phenomenon, then the environment should be initialized with a beginning condition where the phenomenon has not yet occurred.

#### Static Problems

Here we should pause to say temporality is not required for all simulations.

"What happens to humidity as it rains?"

This lies in the static problem space, it is possible to model the relationship in a sweep of values. Such evaluations are piecewise components of temporal problems: when “*x is less than X*~0~*”  *allows for the static component to exist, but in simulation the question eventually arises of when the change in* x* occurs.

We will proceed to establish that the following sections on modeling addresses problems with temporality, effectively that time will always be an input variable.

### Conditionality

From above, removing the reference to humidity:

“What happens when it rains?”

The prompt provides that we will need to account for rain in the environment, there’s at least an E to define. We could model clouds and how much water is contained in the cloud. Another approach is rainfall is measured in depth, depth implies an area that the rain falls over, and time can indicate a fall rate.

Ultimately the usefulness of signals is dubious as we have no idea what to extract based on the prompt. Exit conditions inform the path to environment design. Tautologically, the more constrained a hypothesis can be formed around a hypothetical, the more successfully a simulation can be designed.

What this means is we cannot proceed without at least one condition to observe that is not the phenomenon itself. The Y in form A can not be X and the topic of C in form D can not be the only entity within E.

## Formalization

Up to this point, the variables used have been somewhat loosely defined (what is the environment? How can it be codified?). Before determining sufficiency, we’d best be served by formalizing their definitions.

### Environment (E)

Representation of the environment takes the form of a collection of *systems* which affect the *component* values of *entities* within the environment. An entity is something uniquely observable through its component values; anything observable is an entity. An instance of a component must be linked to only one entity. Entities have no behavior. Only systems *do *things in an environment.

Practically, component values are the signals to extract, they are what convey state, and their changing is the progression in the environment.

For example, time itself can be an entity, with a time counter component value tracking increments and a system can be responsible for incrementing the component value on every clock cycle. In a time bounded experiment, we would read the component value from the one entity with a time counter component, and check its value on every clock cycle.

### Time (T)

A discrete incrementation of time affects a resampling of states within the environment. The foundational variable, the one from which all changes cascades, is time.

"What happens to humidity as it rains?"

Form D hypotheticals does not explicitly rely on time, but serves as an indication that we’ve sufficiently captured a phenomenon. Emergent from this idea is there are other variables like time that serve as logical boundaries of observation.

### Condition (C)

That which can be evaluated through signals of the environment for a boolean state is a condition. They can be based on immediately available signals or rely on memory aggregate throughout the lifetime of the simulation.

# Simulations

In order to build a simulation from natural language prompts, we need to be confident form D both:

1. Sufficiently captures the intent of natural language hypotheses

2. Provides sufficient information to execute a simulation

Or, natural language hypotheticals should be compilable into form D, and a form D compilation needs to be compilable into a simulation as executable code.

# Codifying Simulations

In the above section we described an implementation of entity component system architecture. Much of the preference over an object-oriented approach comes from the intention to have LLMs implement simulations.

In a feedback loop between user and agent, supporting changes for object-oriented code involves potentially breaking method signatures and constructors whereas ECS systems are modular. We can disable effects and add new ones, and bad changes are isolated. Changes to object-oriented code are not *re-writable* in a sense, bad code compounds if the user is not actively pruning unintended effects.

More ambitiously, we will establish a rule that everything to do with the mechanics of the simulation is defined in an ECS pattern, with downstream processing and prompt handling as outside this constraint. The agent is only ever allowed to define entities, components, and systems.

ECS is commonly employed for graphics and videogames, but a more useful framing for our use might be modular synthesis. The aim is not necessarily to simulate individual raindrops, but functions (modules as systems) that represent rain. Time as a system makes more sense with this framing, more as a clock module than a for-loop counter.

In terms of architecture around the engine, we will be minimalistic in defining fundamental structures but maximalistic in coverage of when intervention can happen and signals are made available.

## Scaffolding

Much of the decisions to this point and the following prioritize code *re-writability* in places outside of where there is a common right implementation. Common scaffolding should ultimately be very generic, preferring type parameters.

### Condition Evaluator System

We already know the logic to end the simulation needs to be captured. At the end of the evaluation loop, this system will determine if an exception needs to be thrown.

### Artifacts

All simulations seek to produce some kind of result for analysis, a record of the simulation happening. We want metrics to be exposed for display in cycle-to-cycle real time. As experiments can be long running, the data should be accessible through a pull model based on the windowing of slices.

Practically what this means is one of the final processes in an execution cycle is responsible for handling all metrics from within the ECS engine. All components are metrics in this sense. This deloads the responsibilities of agent generated systems and dually allows for simulation playback by creating state.

In summary, a metrics aggregator should be considered part of scaffolding, as well as a metrics querying system to respond to input messages.

### Realtime Commands

The temporal nature of the engine lends to playback controls of starting, pausing, and ending.

The api should also support engine changes. Hot-swapping systems, entity injection, and component mutations should be possible through an engine manager.

An engine controller with an event bus outside of the system evaluation loop should suffice to support real-time communication. An api defines supported meta commands.

### Server

Ultimately, these endpoints will be useful for agent tool-calling to control the simulator. An http server exposing the simulation engine functions as a compatibility bridge.

## Code

The following sections serve as guidelines for code layout and principles for implementations by agents. LLM generated code should only ever write or modify files in the plugin directories noted above. Code outside of these directories are considered scaffolding. We enumerate this to serve as a table of contents and will describe each file below.

### Structure

```
project/
├── src/
│   ├── ecs/
│   │   ├── entity/
│   │   │   ├── EntityManager.ts
│   │   │   └── Entity.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ComponentType.ts
│   │   │   ├── ComponentManager.ts
│   │   │   └── implementations/
│   │   │       ├── TimeComponent.ts
│   │   │       └── plugins/
│   │   │           └── (agent-defined components live here)
│   │   ├── systems/
│   │   │   ├── System.ts
│   │   │   ├── SystemManager.ts
│   │   │   └── implementations/
│   │   │       ├── TimeSystem.ts
│   │   │       └── plugins/
│   │   │           └── (agent-defined systems live here)
│   │   │
│   │   ├── messaging/
│   │   │   ├── Bus.ts
│   │   │   ├── MessageHandler.ts
│   │   │   └── handlers/
│   │   │       ├── inbound/
│   │   │       │   ├── InboundHandlerRegistry.ts
│   │   │       │   └── implementations/
│   │   │       │       ├── Start.ts
│   │   │       │       ├── Pause.ts
│   │   │       │       ├── Stop.ts
│   │   │       │       ├── InjectEntity.ts
│   │   │       │       └── plugins/
│   │   │       │           └── (agent-defined outbound handlers live here)
│   │   │       │
│   │   │       └── outbound/
│   │   │           └── implementations/
│   │   │               ├── Acknowledgement.ts
│   │   │               ├── Frame.ts
│   │   │               └── plugins/
│   │   │                   └── (agent-defined outbound handlers live here)
│   │   └── Player.ts
│   │
│   ├── evaluator/
│   │   └── ConditionEvaluator.ts
│   │       └── implementations/
│   │           ├── ThresholdConditionEvaluator.ts
│   │           └── plugins/
│   │               └── (agent-defined evaluators live here)
│   │
│   ├── routes/
│   │   ├── apiRoutes.ts
│   │   ├── controls.ts
│   │   ├── metrics.ts
│   │   └── plugins/
│   │       └── (agent-defined routes live here)
│   │
│   ├── server.ts
│   └── main.ts
│
├── package.json
└── README.md
```
### Summary of Scope

This service is only responsible for managing the simulator. To give some idea of where we’re going with this:

1. User provides a hypothetical

2. Agent writes form D transformation of hypothetical

3. Agent develops specialized plugin systems from form D transformation

4. Agent starts service

5. Agent initializes the engine through the service, pinging the service until ready

6. Agent starts the simulation

7. Agent pings status and handles user queries on state of simulation

Only from step 4 is the engine and service involved. Agent behavior will be defined in later sections. We will continue to describe the scaffold in greater detail towards the clarity of a spec.

The descriptions that follow are intended to provide descriptions with enough specificity for coding agents to use and some decisions are informed by this idea:

- Favor decisions that limit changes across multiple files when writing plugins

- Strict adherence to ECS principles

- Development path favors completeness of flows within the engine

- Implement up to testable/implementable checkpoints where context is sufficient

- Favor testable code

- Instantiable base classes

- Maximally expose signals over information hiding

We will attempt to present language-agnostic descriptions, with the bet that sufficient logic can be rendered into code of slight variation. 

Each checkpoint that follows (delimited by roman numeral indicators) should cumulatively employ definitions from previous checkpoints starting with concepts of low dependency to future definitions (depth first from the lowest level). This should translate to definitions of foundational pieces (primitives, input channels, etc.) to be more verbose, and higher levels (implementations) taking advantage of abstraction.

### I. Primitives

We will begin with the definitions associated with entities and components.

#### Entity

An entity encapsulating a discrete and discrete thing, computationally a point in memory, can be represented as a number. There are no dimensions to an entity outside of that specifier, reserving further description to components.

#### ComponentType

A component is a describer of an entity. ComponentType serves to distinguish kinds of attributes (color from position) and runtime identity must be unique for each kind when systems action based on entities with specific components.

Each kind of ComponentType links to an interface which defines the shape of the attribute data (for example color is represented by r, b, and g integer values), serving as a contract during instantiation of a component.

Practically, coding agents will define new component types with a contract interface for the shape of the data, and the new ComponentType with the contract, in a new file under the plugins directory of component implementations.

#### EntityManager

The entity manager holds the collection of entities within the simulation. The manager can create and remove entities from this collection by an entity’s specifier. When an entity is removed, the associated components should be removed by the component manager.

#### ComponentManager

The component manager retrieves, creates, and removes components within the simulation.

It can retrieve all components linked to an entity, or a component of an entity given a ComponentType. It can retrieve all entities with a component of a given ComponentType. The component manager can link a component to an entity, given an entity can only have one component per ComponentType. The component manager can remove either all the components from an entity or a specific component, given a ComponentType.

### II. System

After the system is defined, we will be able to manipulate the environment entities and components.

#### System

A system is responsible for executing logic to mutate the state of an environment through the entity and component managers. Systems themselves have no state. Systems create state through entities and components. They simply implement an update  method and optionally hooks to execute on initialization and destruction. The ecs player is responsible for executing these hooks.

### III. Time

We will now define specific system and component implementations for time. By the end of this checkpoint, we should have some confidence that systems can advance the core signal per update cycle.

#### TimeComponent

The time component tracks the state of time from the beginning of the simulation. This is represented by an integer that increments on update.

#### TimeSystem

The time system on instantiation creates an entity with a time component. On update, it increments this entity’s time component.

### IV. Orchestration

We now have the materials to approach orchestration, enough for a basic, perpetually updating environment: a TimeSystem with its update method being called in a loop. Before we implement that player, we want to be sure all the dependencies are in place.

Note configuration is not a part of scaffolding and it is still our intention to have checkpoints built sequentially without revisiting past definitions. Configuration is left to branches of the scaffold in source code, with this section defining the core operations of engine management that can be modified. In this sense, we have something closer to a self-contained script than a production-grade micro-service.

#### SystemManager

The system manager, provided an entity and component manager, retrieves, creates, and removes systems used within the simulation engine. The manager enumerates the order of execution of the systems and is responsible for triggering lifecycle hooks of each system.

#### Player

The Player file contains the simulation engine, constructed with entity, component, and system managers. This is the base implementation of the engine and future extensions will expose messaging to and from the engine. The player defines the playback functions of the engine; once initialized, a simulation can be started, paused, or stopped. On start, the loop of system evaluation begins. On pause, the loop is suspended at the current state. On stop, the components and entities of the simulation are destroyed, returning the simulation to an initialized state.

### V. Messaging

The player will need visibility of the environment’s state in order to detect the end of the simulation and to aggregate metrics. As the engine systems are initialized using component and entity managers, we know some level above also has access to these abstractions and through them, all the signals of the environment.

In this checkpoint, we will define the necessary files for the player to send a continuous stream of state from and to the environment.

#### Bus

This lightweight file describes a bus with a callback register and send function. The player is instantiated with an input bus and an output bus. The calling layer subscribes to the output bus in order to receive messages from the player and the player subscribes to the inbound bus to receive messages.

Messages on the bus need typing in order to trigger specific reactions (for example, pause messages sent to the player), and handlers need to be defined for each type.

#### MessageHandler

The MessageHandler file defines the base message and message handler structures. A message is defined with an optional identifier, the type of the message, and the structure of the payload of the message. The message handler is declared for a specific message type. Every message handler contains the corresponding type of message under its responsibility and a function for how to process the message.

### VI. IO Player

In this checkpoint we will define an extension of the base player that accepts commands through an input bus, actions based on the command, and returns an acknowledgement through the output bus. Additionally the output bus sends a continuous stream of simulation state.

#### Start

The start file defines the message handler to call the start function of the player.

#### Pause

The pause file defines the message handler to call the pause function of the player.

#### Stop

The stop file defines the message handler to call the stop function of the player.

#### InjectEntity

This file defines a handler to create an entity from the values provided from an inbound message and inserts it into the simulation using the entity manager.

#### InboundHandlerRegistry

The inbound handler registry maps inbound message types to the message handlers of the player. Practically, in order to pause the engine, an inbound message of type pause will trigger the engine to pause.

#### Acknowledgement

The acknowledgement file defines the responses to inbound messages. Acknowledgements are linked to the initiating message through a message id. An acknowledgement is either success or error.

#### Frame

The frame file defines the shape of a snapshot of the simulation including all the present entities with their component values with an identifier for the tick of the frame.

#### IOPlayer

The input-output player synthesizes the above for an extension of the player that is responsive to bus commands and outputs the state of the simulation on every cycle as frames.

### V. Condition Evaluation

### VI. Simulation Management

## Test-driven Development

When aggregate descriptions are sufficient to codify we will follow these steps:

1. Generate the skeleton of the files (without implementing business logic) from the descriptions

2. Given the descriptions, generate test files of comments only, capturing intent of the test to be implemented

3. Codify a test for each comment, importing the finished skeleton

4. Implement the business logic in the skeleton

5. Run tests and resolve errors until no errors

This is a flow we will revisit at various points when enough information has been provided for incremental codification with minimal assumptions about the larger codebase. The purpose of this orientation is to separately capture intent through testing and intent through implementation. In fact, step 1 and 2 may be conducted in parallel by two actors. Synthesis in step 3 validates sufficiency in signals and joins the two contexts for the rest of the sequence.

Descriptions

├─► Stage 1: Skeletons (structure, empty methods)

└─► Stage 2: Test Intents (comment-only requirements)

Stage 3: Codify Tests

└─ Join (Skeletons + Test Intents) → Actual tests

Stage 4: Implement Logic

└─ Fill skeletons to satisfy tests

Stage 5: Validate

└─ Run tests → Errors → Iterate until green

To be clear, this document upon delivery to you, the reader, should provide logic that is compilable to code.

# Agentic Instructions

Why do we spend more time producing more text than code that actually runs? Re-writable artifacts translate to interfaces and business logic with some but minimal variation. Our base assumption is implementation tooling (including LLM assistance) and hardware improves, while human operators have relatively static capabilities in understanding code and algorithmic efficiency is fundamentally unchanging. 

The human operator is responsible for intuiting where bottlenecks in memory and computation occur. The complete artifact can only be comprehended by the originator until it is manifested.

The following are instructions for the reader towards implementation of the descriptions of the body of code above. We will describe a generic process, but expect this document to be consumed by agent operators. The proceduralist, mechanistic nature of the instructions are intended to reduce errors and provide traceability of decisions, which will aid revisions of this document; it is imperative to follow as outlined.

## Bootstraps

This document will serve as the source of truth for task generation. For context management, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

- Bootstraps section to a file with a name formed from the name of this document appended with *_bootstraps*

- Master Prompt section to a file with a name formed from the name of this document appended with *_master_prompt* 

- Codifying Simulations section to a file with a name formed from the name of this document appended with *_codifying_simulations*

- The text portion from the beginning of this document to the beginning of Codifying Simulations to a file with a name formed from the name of this document appended with *_theory*

Review and create an index for the *instruction_documents* directory describing the contents of the directory.

Create instructions for future visitors to review the latest version of this document in a high visibility location (eg. AGENTS.md). We can see that bootstrapping is a process that is independent of generation of the artifact itself. To be clear, the term artifact refers to the manifestation of the descriptions within Codifying Simulations.

```
/
├── <this document's file name>.md
├── AGENTS.md
├── checks.sh
├── instruction_documents/
│   ├── <this document's file name>_theory.md
│   ├── <this document's file name>_bootstraps.md
│   ├── <this document's file name>_codifying_simulations.md
│   └── index.md
├── tools/
│   └── index.md
├── workspaces/
│   └── <this document's file name>/
├── verifications/
└── memory/
    ├── ways/
    └── records/
```
Using the above as a guide for bootstrapping, we’ll enumerate how the layout is constructed.

### Tools

Actions taken are to be expressed through a repository. A directory called *tools* will be used to aid in artifact generation. If the directory does not exist, create it. A file within tools will serve as an index of tools within the directory, with a description of what tools do.

Tools may be thought of as shortcuts for the actions taken during a task that can be effectively captured as deterministic scripts. This is said to convey why the directory might be visited (before attempting commands) and when to concretize a tool (after a novel approach). For example, the previous section explained directory layout in a deterministic way; it could be prudent to create the directory structure using a script and leave the population to generative actors.

### Workspaces

This document serves as the nexus for autonomous production of code. If a directory named *workspaces* is not defined, create the directory. The filename of this document will serve as the name of the workspace for this attempt at generating the artifact. If a directory with the filename of this document does not exist in the workspaces directory, create the directory.

Practically, after bootstrapping, all source code of the implementation of the artifact will be written in workspaces corresponding to the most recent revision of this document.

### Memory

Progress on the artifact as well as bootstrapping processes should be cataloged in an accessible way in a directory named memory. There are two types of memories, records in a directory named *records* under the memory directory, and ways memories in a directory named *ways* (create all directories if they do not yet exist).

Conceptually, ways are long-term memories that should shape decisions and records are short-term memories which inform what might be more pertinent to the present and near future. Again, this is said to convey when memories might be visited (before beginning a task) and when to write memories (after the work of a task is completed).

#### Ways

Ways memories capture assumptions extracted from this document that went into the decisioning of implementations. They shape future decisions in a global way, a reshaping of the document’s concepts as artifacts are constructed. Beyond best-practices, they inform future contributors of how to approach task framing. Ways are text files with filenames (in snakecase) that convey the contained content and are write-delete only. They may not be updated for reasons of mitigating concurrent touches.

#### Records

Records are text files of the changes to be concretized. The filename should be a timestamp prepending a short title of changes. They are write-only. Records should be thought of as compression of the description of the state of the implementation, with more information density towards recent developments. In this way, a sequence of records should indicate the path towards completeness.

### Checks

The verifier is a script (*checks.sh*) that resides in the root directory (create this file if it does not exist). This is the access point to testing of the present artifact. All testing should be linked to the execution of the verifier script, taking care of the relative path to the workspace. Running the script should validate the setup of the repository as well as artifact implementation, with an resultant output file written to a verifications directory (create if this does not exist). Each verification output file should be named with a timestamp.

## Master Prompt

There are two roles for an agent to exclusively execute upon. One who generates tasks, and one who implements tasks.

### Tasker

When you are responsible for determining the next steps open-endedly, examine the state of the present revision workspace and memories and enumerate tasks that forward the state of artifact construction, with as much context regarding development patterns and best practices as needed (prioritizing file references to instruction documents over literal conveyance).

Phase 1 — Bootstrapping

- Prepare repository structure as described in Bootstraps.

- Split this document into component instruction files.

- Create or update index.md and AGENTS.md for visibility.

- Ensure tools/, workspaces/, and memory/ directories exist.

Phase 2 — Artifact Creation

- Enter the workspace for the current revision.

- Proceed through checkpoints in order.

- Each checkpoint represents a coherent milestone, building on prior ones.

- For each checkpoint:

- Define skeletons (structure, empty methods).

- Write test intents (comment-only).

- Codify tests from intents.

- Implement logic to satisfy tests.

- Validate until all tests pass.

### Task Staging

Generally, individual tasks should touch one of:

- Environment files such compiler configurations, test harnessing

- Source code of the implementation of the artifact

- Test code of implementation files

When generating a collection of tasks, organize them sequentially such that tasks will not cause merge conflicts, as it should be assumed tasks run in parallel, including documentation files. This can mean generating fewer tasks or stubbing files to arrive at a point where more complexity can be implemented.

### Implementer

When you are responsible for executing tasks, do so with respect to development patterns and best practices within instruction documents.
