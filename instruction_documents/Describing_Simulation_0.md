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

Or, natural language hypotheticals shoul/d be compilable into form D, and a form D compilation needs to be compilable into a simulation as executable code.

# Codifying Simulations

In the above section we described an implementation of entity component system architecture. Much of the preference over an object-oriented approach comes from the intention to have LLMs implement simulations.

In a feedback loop between user and agent, supporting changes for object-oriented code involves potentially breaking method signatures and constructors whereas ECS systems are modular. We can disable effects and add new ones, and bad changes are isolated. Changes to object-oriented code are not *re-writable* in a sense, bad code compounds if the user is not actively pruning unintended effects.

More ambitiously, we will establish a rule that everything to do with the mechanics of the simulation is defined in an ECS pattern, with downstream processing and prompt handling as outside this constraint. The agent is only ever allowed to define entities, components, and systems.

ECS is commonly employed for graphics and videogames, but a more useful framing for our use might be modular synthesis. The aim is not necessarily to simulate individual raindrops, but functions (modules as systems) that represent rain. Time as a system makes more sense with this framing, more as a clock module than a for-loop counter.

In terms of architecture around the engine, we will be minimalistic in defining fundamental structures but maximalistic in coverage of when intervention can happen and signals are made available.

## Scaffolding

Much of the decisions to this point and the following prioritize code *re-writability* in places outside of where there is a common right implementation. Common scaffolding should ultimately be very generic, preferring type parameters.

### Artifacts

All simulations seek to produce some kind of result for analysis, a record of the simulation happening. We want metrics to be exposed for display in cycle-to-cycle real time. As experiments can be long running, the data should be accessible through a pull model based on the windowing of slices.

Practically what this means is one of the final processes in an execution cycle is responsible for handling all metrics from within the ECS engine. All components are metrics in this sense. This deloads the responsibilities of agent generated systems and dually allows for simulation playback by creating state.

In summary, a metrics aggregator should be considered part of scaffolding, as well as a metrics querying system to respond to input messages.

### Realtime Commands

The temporal nature of the engine lends to playback controls of starting, pausing, and ending.

An engine controller with an event bus outside of the system evaluation loop should suffice to support real-time communication. An api defines supported meta commands.

### Server

Ultimately, these endpoints will be useful for agent tool-calling to control the simulator. An http server exposing the simulation engine functions as a compatibility bridge.

## Code

The following sections serve as guidelines for code layout and principles for implementations by agents. LLM generated code should only ever write or modify files in the plugin directories noted above. Code outside of these directories are considered scaffolding. We enumerate this to serve as a table of contents and will describe each file below.

### Code Structure

```
project/
├── src/
│   ├── core/
│   │   ├── Player.ts
│   │   ├── IOPlayer.ts
│   │   ├── simplayer/
│   │   │   ├── SimulationPlayer.ts
│   │   │   └── operations/
│   │   │       ├── Start.ts
│   │   │       ├── Pause.ts
│   │   │       ├── Stop.ts
│   │   │       ├── EjectSystem.ts
│   │   │       └── InjectSystem.ts
│   │   │
│   │   ├── evalplayer/
│   │   │   ├── EvaluationPlayer.ts
│   │   │   └── operations/
│   │   │       └── InjectFrame.ts
│   │   │
│   │   ├── entity/
│   │   │   ├── EntityManager.ts
│   │   │   └── Entity.ts
│   │   │
│   │   ├── components/
│   │   │   ├── ComponentType.ts
│   │   │   ├── ComponentManager.ts
│   │   │   └── TimeComponent.ts
│   │   │
│   │   ├── systems/
│   │   │   ├── System.ts
│   │   │   ├── SystemManager.ts
│   │   │   └── TimeSystem.ts
│   │   │
│   │   └── messaging/
│   │       ├── Bus.ts
│   │       ├── outbound/
│   │       │   ├── Frame.ts
│   │       │   ├── FrameFilter.ts
│   │       │   └── Acknowledgement.ts
│   │       │
│   │       └── inbound/
│   │           ├── Operation.ts
│   │           ├── MessageHandler.ts
│   │           └── InboundHandlerRegistry.ts
│   │
│   │
│   ├── routes/
│   │   ├── router.ts
│   │   ├── simulation.ts
│   │   ├── evaluation.ts
│   │   ├── codebase.ts
│   │   └── information/
│   │           ├── Describing_Simulation.md
│   │           └── api.md
│   │
│   ├── server.ts
│   └── main.ts
│
├── plugins/
│   ├── simulation/
│   │   ├── components/
│   │   │   └── (agent-defined components)
│   │   ├── systems/
│   │   │   └── (agent-defined systems)
│   │   └── operations/
│   │       └── (agent-defined handlers)
│   │
│   └── evaluation/
│       ├── components/
│       │   └── (agent-defined evaluation components)
│       ├── systems/
│       │   └── (agent-defined evaluation systems)
│       └── operations/
│           └── (agent-defined evaluation handlers)
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

The system manager, provided an entity and component manager, retrieves, creates, and removes systems used within the simulation engine. The manager tracks the order of execution of the systems and is responsible for triggering lifecycle hooks of each system. Adding and removing systems involves inserting based on the index of execution.

#### Player

The Player file contains the simulation engine, constructed with entity, component, and system managers. This is the base implementation of the engine and future extensions will expose messaging to and from the engine. The player defines the playback functions of the engine; once initialized, a simulation can be started, paused, or stopped. On start, the loop of system evaluation begins. On pause, the loop is suspended at the current state. On stop, the components and entities of the simulation are destroyed, returning the simulation to an initialized state.

### V. Messaging

The player will need visibility of the environment’s state in order to detect the end of the simulation and to aggregate metrics. As the engine systems are initialized using component and entity managers, we know some level above also has access to these abstractions and through them, all the signals of the environment.

In this checkpoint, we will define the necessary files for the player to send a continuous stream of state from and to the environment.

#### Bus

This lightweight file describes a bus with a callback register and send function. The player is instantiated with an input bus and an output bus. The calling layer subscribes to the output bus in order to receive messages from the player and the player subscribes to the inbound bus to receive messages.

Messages on the bus need typing in order to trigger specific reactions (for example, pause messages sent to the player), and handlers need to be defined for each type.

### VI. IO Player

In this checkpoint we will define an extension of the base player that accepts commands through an input bus, actions based on the command, and returns an acknowledgement through the output bus. Additionally the output bus sends a continuous stream of simulation state.

The operations defined in this section serve as controllers mappable within an inbound message handler registry for the player. Operations are the most narrow functions of the player and the registry allows recombination of operations for complex controller processes.

#### InboundHandlerRegistry

The inbound handler registry maps inbound message types to the message handlers of the player. Practically, in order to pause the engine, an inbound message of type pause to the player will cause a lookup for the handler for what sequence of operations to execute.

#### MessageHandler

The MessageHandler file defines a sequence of operations for execution, returning an acknowledgement.

#### Operation

The operation file defines the base interface for discrete actions of players. An operation’s execution is invoked with a player and message data.

#### InjectSystem

The inject system file defines the operation to add a system through the system manager of a player.

#### EjectSystem

The eject system file defines the operation to remove a system through the system manager of a player.

#### Acknowledgement

The acknowledgement file defines the responses to inbound messages. Acknowledgements are linked to the initiating message through a message id. An acknowledgement is either success or error.

#### Frame

The frame file defines the shape of a snapshot of the simulation including all the present entities with their component values with an identifier for the tick of the frame.

#### FrameFilter

A frame filter is used to process frame objects to disclude components prior to outbound bus publication.

#### IOPlayer

The input-output player synthesizes the above for an extension of the player that accepts inbound messages and outputs the state of the simulation on every cycle as frames.

The input-output player is intended as the base version for multi-player use cases. The following simulation player builds on top of the IOPlayer by simply concretizing operations suited for simulations. Extensions of the IOPlayer simply define data protocols; new components define signals, new systems produce the components, and consumers decide how to extract value from the components.

### VII. Simulation Player

#### Start

The start file defines the operation to call the start function of the player, returning an acknowledgement.

#### Pause

The pause file defines the operation to call the pause function of the player, returning an acknowledgement.

#### Stop

The stop file defines the operation to call the stop function of the player, returning an acknowledgement.

#### SimulationPlayer

The simulation player synthesizes the above for an extension of the input-output player that is responsive to bus commands to manipulate simulation playback and outputs the state of the simulation on every cycle as frames.

### VIII. Evaluation Player

By this point, the input-output player can be initialized and controlled, producing a flow of simulation data. This works well enough for general observation or producing time-series volumes for analysis.

In this section we will define the evaluation player, an extension of the input-output player with operations to catalog frames. The player is useful for building derivations or signals such as condition evaluations.

#### InjectFrame

The inject frame file defines the operation to create an entity with a frame component containing frame data. Each frame is stored within the engine as a separate entity.

#### EvaluationPlayer

The evaluation player extends the input-output player, passively accepting frames from the inbound bus and publishing evaluation of conditions. The player hides historical frames using the frame filter before publishing to outbound.

We conclude this checkpoint by stating derivation logic is intended to be captured ad-hoc to serve specific use cases, rather than concretely defining condition checking. Generally, what can work is injection of systems which produce entities with actionable components and listening for those components from the outbound bus.

### IX. Sim-Eval Server

Towards usability, the simulation evaluation player network will be front-ended with a basic http server, with an api exposing operations of both players. In this section we will define interoperability between the players with a server control surface. By the end, we should be able to support this flow:

1. On program start, evaluation and simulation players are initialized, piping simulation outbound frames to evaluation inbound bus, server is listening

2. Upload a system plugin and component plugin for the simulation player

3. Upload a system plugin and component plugin for the evaluation player

4. Start simulation

5. Fetch most recent frame of the evaluation player

This flow simplifies initialization; when the server is up, the simulation is ready. The api is intended to return actionable information with error responses and simple probes, directing clients to an information route, with basic acknowledgements otherwise.

#### Main

The main file is the entrypoint to start the server.

#### Server

The server file initializes the two players and links their messaging buses. Each server manages a single sim-eval environment. After players are initialized, an http server starts listening with a router.

#### Router

The router channels requests to control and read from the sim-eval environment. The root path returns an index of informational endpoints, where each endpoint maps to a markdown file defined in this section.

#### Simulation

The simulation routes file defines the routes of the api for playback as well as system and component injection and ejection. The simulation routes should also contain a path to forward the outbound bus data as server side events.

#### Evaluation

The evaluation routes file defines the route to inject and eject systems and components for the evaluation player. The evaluation routes should also contain a path to forward the outbound bus of the evaluation player as server side events.

#### Codebase

The codebase routes file defines an endpoint to crawl through the source code defined in this project by filepath. This is primarily useful for defining plugins. This feature-set also defines an endpoint to view the entire directory structure of the codebase.

#### Api.md

The api markdown file documents all the endpoints implemented in this checkpoint.

#### Describing_Simulation.md

The entire source documentation is copied here.

#### Plugins

Real-time injection of operations, system and component source code is a two-step process. First the source code is uploaded and plugin files are placed into the appropriate directory. Once acknowledged as a success response with system identifier, a further api call will add the system to the sequence of player evaluation.

## Integration

Following the implementation of the codebase described in codifying simulations, we implement an integration test to reveal gaps in execution and prove usability from the vantage of a user without prior knowledge. Usage can be knowable through probing the service.

This stage is intended to massage the codebase towards spec alignment and the general pattern should be to test and make changes to the source code; if any step fails, resolve in the source code workspace.

### Artifacts

The steps to run integration should also be captured in the *run_integration.sh* script with comments for each step enumerated below.

### Steps

Prior Knowledge Assumption (PKA) will be used throughout this section to describe the assumed basis of familiarity with the project. Assume that each step aggregates on the PKA of previous steps.

The big picture is we are assuming the role of a first-time user evaluating the project with a simulation in mind. The simulation to construct is a basic temperature control unit. This user should be able to derive the process to accomplish the goal without reviewing documents outside of the api surface. Capture sim-eval output as artifacts and computationally validate the simulation behavior with an artifact as proof.

#### Build & Start Service

The first step is to install dependencies and start the sim-eval service. Completeness of this step means output produces which port and address the service is running on.

PKA: none, installation and running the service should be trivial.

#### Learn Usage

The second step is to validate that the api has a discoverable surface. The root domain should display the available api segments: simulation, evaluation, and codebase.

PKA: the user should only have the sense to probe the root domain.

#### Validate State Before Start of Simulation

The third step is to validate that the sim-eval instance has not started and no events are emitted.

PKA: from previous steps.

#### Inject Valid Systems and Components

The fourth step is to inject systems and components of the simulation. Read through documentation to understand system and component design, then navigate through the codebase for specific implementation patterns. This step is concluded when the sim-eval server accepts the injected files.

PKA: from previous steps.

#### Start of Simulation

The fifth step is to start the simulation and verify behavior of event streams.

#### Validate Behavior

Determine if the streams produce actionable information. The script(s) should be stored under tools of the root directory, and proof artifacts should be stored in verifications of the root directory.

# Agentic Instructions

Why do we spend more time producing more text than code that actually runs? Re-writable artifacts translate to interfaces and business logic with some but minimal variation. Our base assumption is implementation tooling (including LLM assistance) and hardware improves, while human operators have relatively static capabilities in understanding code and algorithmic efficiency is fundamentally unchanging. 

The human operator is responsible for intuiting where bottlenecks in memory and computation occur. The complete artifact can only be comprehended by the originator until it is manifested.

The following are instructions for the reader towards implementation of the descriptions of the body of code above. We will describe a generic process, but expect this document to be consumed by agent operators. The proceduralist, mechanistic nature of the instructions are intended to reduce errors and provide traceability of decisions, which will aid revisions of this document; it is imperative to follow as outlined.

## Discoverability

Our definition of usability emphasizes discoverability: does the sim-eval api convey usage to an un-knowledgeable user? This is different from intuitiveness. Intuitiveness is easy to observe in the real world based on multi-sensory feedback; when I tap this, then I see this visual. Discoverability is like intuitiveness in the conceptual space. A highly discoverable knowledge artifact is simple in its outward facing view. Knowledge is optimally one-to-many and the many is hierarchical in usefulness. You have few methods of exploration with expansive optionality.

Anti-discoverability patterns preclude successful conveyance of information. It’s obvious incomplete information and conflicting information leads to hallucination. Additionally haystacks of context and inordinate redirection leads to a messy context.

Discoverability in the conceptual space requires care in mapping. You use a glossary to find definitions to a word, an index to find where the word occurs, and a table of contents to scan for associative segments. Such patterns will shape agent design of the agent bootstrapping and again in the section on integration.

## Bootstraps

This document will serve as the source of truth for task generation. Bootstrapping is a process that is independent of generation of the sim-eval codebase itself. For context management, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

- Bootstraps section to a file with a name formed from the name of this document appended with *_bootstraps*

- Repository Structure section to a file with a name formed from the name of this document appended with *_repository_structure*

- Code Structure section to a file with a name formed from the name of this document appended with *_workspace_structure*

- A *mindset_prompts* directory containing:

- Tasker section of Agent Prompts section to a file with a name formed from the name of this document appended with *_tasker_prompt*

- Implementer section of Agent Prompts section to a file with a name formed from the name of this document appended with *_implementer_prompt*

- Integrator section of Agent Prompts section to a file with a name formed from the name of this document appended with *_integrator_prompt*

- Master Prompt section to a file with a name formed from the name of this document appended with *_master_prompt_important*

- Codifying Simulations section to a file with a name formed from the name of this document appended with *_codifying_simulations*

- The text portion from the beginning of this document to the beginning of Codifying Simulations to a file with a name formed from the name of this document appended with *_theory*

- Schedule of Work section to a file with a name formed from the name of this document appended with *_schedule_of_work*

This file as-is should be transferred to *instruction_documents* and the structure (hierarchical header leveling) should be written to a table of contents, serving as a pseudo-index for topics. Preference is agents should take read segmented texts over the entire source after bootstrapping is completed (a point to emphasize in the *instruction_documents *index file).

Review and create an index for the *instruction_documents* directory mapping file names to a summary of file contents. Additionally create an index within the prompts directory enumerating file contents.

Instructions for future visitors to review the index for instruction_documents are to be placed in a high visibility location (eg. AGENTS.md).

### Repository Structure

The following maps the structure of the repository following bootstrapping.

```
/
├── <this document's file name>.md
├── AGENTS.md
├── checks.sh
├── instruction_documents/
│   ├── mindset_prompts/
│   │   ├── <this document's file name>_tasker_prompt.md
│   │   ├── <this document's file name>_implementer_prompt.md
│   │   ├── <this document's file name>_integrator_prompt.md
│   │   ├── <this document's file name>_aligner_prompt.md
│   │   ├── <this document's file name>_optimizer_prompt.md
│   │   └── index.md
`│   ├── <this document’s file name>``_master_prompt_important``.md`

│   ├── <this document's file name>_bootstraps.md
│   ├── <this document's file name>_repository_structure.md
│   ├── <this document's file name>_workspace_structure.md
│   ├── <this document's file name>_codifying_simulations.md
│   ├── <this document's file name>_theory.md
│   ├── <this document's file name>_implementation_guidelines.md
│   ├── <this document's file name>_schedule_of_work.md
│   ├── <this document's file name>_table_of_contents.md
│   ├── <this file in original form copied>.md
│   └── index.md
├── tools/
│   ├── index.md
│   └── run_integration.sh
├── workspaces/
│   └── <this document's file name>/
├── verifications/
└── memory/
    ├── exceptions/
    ├── ways/
    └── records/
```
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

#### Exceptions

The exceptions directory catalogs decisions which disagree with the spec. Exceptions give agents some latitude in execution from the spec when grossly misaligned with best practice or when conflicting instruction is encountered.

### Checks

The verifier is a script (*checks.sh*) that resides in the root directory (create this file if it does not exist). This is the access point to testing of the present artifact. All testing should be linked to the execution of the verifier script, taking care of the relative path to the artifact workspace. Running the script should validate the setup of the repository as well as artifact implementation, with an resultant output file written to a verifications directory (create if this does not exist). Each verification output file should be named with a timestamp.

At this point all files in the directory structure should be understood, except those relevant to integration, which will be wholly explained later.

## Agent Prompts

There are 2 mindsets defined for an agent to execute upon when building the repository during the first two phases. One to generate tasks, and one who implements tasks. During phase 3, the integrator is introduced as an *outsider* to massage the implementation towards usefulness. In phase 4, the aligner is introduced to audit the workspace for correctness regarding directory structure as outlined in the spec and business logic according to per-file specifications. Phase 5 adds the optimizer to improve efficiency without affecting behavior.

### Tasker

When you are responsible for determining the next steps open-endedly, examine the state of the present revision workspace, memories, and schedule of work, and enumerate tasks that forward the state of artifact construction, referencing pertinent instruction documents as guidelines including guidance towards a review of the master prompt.

#### Task Staging

Generally, individual tasks should touch one of:

- Environment files such compiler configurations, test harnessing

- Source code of the implementation of the artifact

- Test code of implementation files

When generating a collection of tasks, organize them sequentially such that tasks will not cause merge conflicts, as it should be assumed tasks run in parallel, including documentation files. Staging around this can mean generating fewer tasks or stubbing files to arrive at a point where more complexity can be implemented.

Task definitions should:

- Be verbose in linking relevant documents as guardrails and explicit regarding workspace location

- Indicate their place in the implementation lifecycle, specifying phase and checkpoint as applicable

- Define when the task can be considered done; implementer contexts are retained for the lifetime of the task, continuation details of the task can only emerge from memory files

- Indicate which agent mindset to assume

Collections of tasks should be written as memory files.

Important instruction documents: Schedule of Work, Bootstraps, Codifying Simulations

### Implementer

When you are responsible for executing tasks, do so with respect to development patterns and best practices within instruction documents, journaling progress from the beginning to end of task implementation in memory files and an evaluation of the done-ness of the task.

Important instruction documents: Schedule of Work, Codifying Simulations, Implementation Guidelines

### Integrator

The integrator mindset, when interrogating usage, acts as a third party without visibility of the full implementation document. This is not enforced with context management but rather intent management of the agent, for the reason that the integrator is also responsible for massaging the source code workspace.

Practically this means you should not read the source code to understand usage, and instead base actions from the discoverable surface of the api.

Important instruction documents: Codifying Simulations

### Aligner

The aligner is charged with comparing the spec’s directory tree with the state of the workspace, confirming or rectifying that:

- All files listed in the specs exist and are in the right place

- All business logic of implementations match the file descriptions of the specs

- There are no extra source files or directories not found in the spec

Alignment is strict, meaning filenames must match for posterity sake. Practically, if a visitor is looking for any file from the spec, that exact file should be present in the correct place in the directory.

Important instruction documents: Codifying Simulations, Repository Structure, Workspace Structure

### Optimizer

The optimizer takes a global vantage of the interoperable business logic between implementations of the spec and addressing optimizations in memory and runtime complexity, preserving behavior.

In executing optimization, prioritize run-time complexity over memory. Prioritize the functions of sim-eval while running above atomic user operations. Broadly, processes that execute continuously take precedence over processes that rely on the rarer input. Priority in this sense relates to trade-offs, not order of address.

### Master Prompt

Based on the directive and inherited context you have been given, determine your mindset (tasker, implementer, integrator, aligner, optimizer), familiarize with that mindset and execute as that mindset given the state of the project. When a task is completed, explicitly hand off responsibility of progress to the appropriate mindset.

# Implementation Guidelines

The appendix contains helpful documents for reference throughout the implementation process. The meta-level guidance is intended to reduce error (hallucinations) by enforcing the definition of intent prior to execution.

## Methodology

The development patterns defined in this section are shaped by the same prioritization found within the previous section: layering implementation such that incremental work builds upon previous work and informs the next block of work.

### Test-driven Development

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

# Schedule of Work

This section outlines the implementation stages, primarily useful for the tasker to determine units of work.

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

Phase 3 — Integration Test

- Implement integration script

- Run test and correct gaps between execution and spec until all gaps are resolved

- Produce artifacts as proof of implementation correctness

Phase 4 — Structural & Behavioral Alignment

- Check codebase against directory structure

- No described file is un-implemented

- All source code exists in the directory structure

- Descriptions of files match source code

Phase 5 — Optimization

- Inspect codebase for optimizations run-time complexity and memory and refactor, validating changes do not break behavior using the integration test
