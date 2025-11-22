# Ch. 1. Describing Simulation

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

# API Map

For readability, this is an enumeration of all the available endpoints of a sim-eval server, followed by reiteration of their functions covered in Checkpoint IX.

```
(1)   GET    /                                      
(2)   GET    /information/Describing_Simulation.md   
(3)   GET    /information/api.md                    
(4)   POST   /simulation/start                      
(5)   POST   /simulation/pause                      
(6)   POST   /simulation/stop                       
(7)   POST   /simulation/system                     
(8)   DELETE /simulation/system/:id                 
(9)   POST   /simulation/component                  
(10)  DELETE /simulation/component/:id              
(11)  GET    /simulation/stream                     
(12)  POST   /evaluation/frame                      
(13)  POST   /evaluation/system                     
(14)  DELETE /evaluation/system/:id                 
(15)  POST   /evaluation/component                  
(16)  DELETE /evaluation/component/:id              
(17)  GET    /evaluation/stream                     
(18)  GET    /codebase/tree                         
(19)  GET    /codebase/file?path=<filepath>         
(20)  POST   /codebase/plugin                       
(21)  GET    /health                                
(22)  GET    /status  
```
### Root Domain

(1) The root domain returns a node with maximal discoverability, being semantically dense but minimal in redundancy. From the information returned here, we can navigate through the universe of knowledge around sim-eval. Concretely it reveals the existence of a path for informational files.

### Informational

The information branch of endpoints contains the theory of sim-eval and the surface of sim-eval management.

#### Source Spec

(2) The source spec is an exhaustive explanation of the theory of sim-eval.

#### Management Surface

(3) The api enumerates all the endpoints (at the top of API Map section) and provides an explanation for their usage

### Simulation

The simulation branch of endpoints governs the execution and control of the simulation player. Each route manipulates the runtime environment or its constituent systems and components.

#### Start

(4) The start command initiates the simulation loop, beginning cyclical evaluation of all active systems in sequence until paused or stopped.

#### Pause

(5) The pause command suspends the simulation at its current tick, preserving all component and entity states for later continuation.

#### Stop

(6) The stop command halts the simulation and clears the environment, returning the engine to an initialized state without active entities or systems.

#### System Injection

(7) The system injection route allows dynamic addition of systems during runtime, extending environment behavior without service restart.

#### System Ejection

(8) The system ejection route removes a system from the execution sequence, immediately ceasing its participation in environment updates.

#### Component Injection

(9) The component injection route attaches new component definitions to entities, enabling new signals or state representations.

#### Component Ejection

(10) The component ejection route removes component definitions from entities, retracting signals from the environment.

#### Stream

(11) The simulation stream emits serialized frames of the environment at each tick. This endpoint provides continuous visibility into the simulation’s internal state and is used for real-time analysis or playback.

### Codebase

The codebase branch of endpoints exposes introspection of the repository and runtime plugin management, allowing users and agents to read, modify, and extend the source environment.

#### Directory Tree

(18) The tree route returns the full directory structure of the project repository, allowing traversal through source files and plugin directories.

#### File Retrieval

(19) The file retrieval route returns the raw text of a source file given its path, enabling inspection of system and component implementations.

#### Plugin Upload

(20) The plugin upload route receives source code for new systems, components, or operations and places them in the appropriate plugin directory. Acknowledgement confirms successful placement and registration.

### System

The system endpoints expose health and state information of the sim-eval service.

#### Health

(21) The health route returns the operational state of the service, including version, uptime, and readiness to handle requests.

#### Status

(22) The status route reports the runtime status of both simulation and evaluation players, indicating whether they are running, paused, or idle.

## Integration

Following the implementation of the codebase described in codifying simulations, we implement an integration test to reveal gaps in execution and prove usability from the vantage of a user without prior knowledge. Usage can be knowable through probing the service.

This stage is intended to massage the codebase towards spec alignment and the general pattern should be to test and make changes to the source code; an outsider makes observations and the implementer makes changes based on feedback.

The big picture is we are assuming the role of a first-time user evaluating the project with a simulation in mind: temperature regulation. The user is curious and technically capable in modeling complex systems and hypothesizing their intermittent states. The user expects to be able to validate outputs of the product, that the simulation emits data approximately matching expectations.

The start script within the tools directory is considered prior knowledge. The outsider knows by running the script, the product is ready for testing.

### Artifacts

The steps to run integration should also be captured in the *run_integration.sh* script with comments for each step enumerated below.

# 

# Agentic Instructions

Why do we spend more time producing more text than code that actually runs? Re-writable artifacts translate to interfaces and business logic with some but minimal variation. Our base assumption is implementation tooling (including LLM assistance) and hardware improves, while human operators have relatively static capabilities in understanding code and algorithmic efficiency is fundamentally unchanging. 

The human operator is responsible for intuiting where bottlenecks in memory and computation occur. The complete artifact can only be comprehended by the originator until it is manifested.

The following are instructions for the reader towards implementation of the descriptions of the body of code above. We will describe a generic process, but expect this document to be consumed by agent operators. The proceduralist, mechanistic nature of the instructions are intended to reduce errors and provide traceability of decisions, which will aid revisions of this document; it is imperative to follow as outlined.

## Discoverability

Our definition of usability emphasizes discoverability: does the sim-eval api convey usage to an un-knowledgeable user? This is different from intuitiveness. Intuitiveness is easy to observe in the real world based on multi-sensory feedback; when I tap this, then I see this visual. Discoverability is like intuitiveness in the conceptual space. A highly discoverable knowledge artifact is simple in its outward facing view. Knowledge is optimally one-to-many and the many is hierarchical in usefulness. You have few methods of exploration with expansive optionality.

Anti-discoverability patterns preclude successful conveyance of information. It’s obvious incomplete information and conflicting information leads to hallucination. Additionally haystacks of context and inordinate redirection leads to a messy context.

Discoverability in the conceptual space requires care in mapping. You use a glossary to find definitions to a word, an index to find where the word occurs, and a table of contents to scan for associative segments. Such patterns will shape agent design of the agent bootstrapping and again in the section on integration.

## Bootstraps

This document will serve as the source of truth for task generation. Bootstrapping is a process that is independent of generation of the sim-eval codebase itself. Using this chapter, Describing Simulation as source material, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

- Bootstraps section to a file with a name formed from the name of this document appended with *_simeval_bootstraps*

- Repository Structure section to a file with a name formed from the name of this document appended with *_simeval_repository_structure*

- Code Structure section to a file with a name formed from the name of this document appended with *_simeval_code_structure*

- A *mindset_prompts* directory containing:

- Tasker section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_tasker_prompt*

- Implementer section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_implementer_prompt*

- Packager section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_packager_prompt*

- Outsider section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_outsider_prompt*

- Aligner section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_aligner_prompt*

- Optimizer section of Agent Prompts section to a file with a name formed from the name of this document appended with *_simeval_optimizer_prompt*

- Master Prompt section to a file with a name formed from the name of this document appended with *_simeval_master_prompt_important*

- Integration section of Codifying Simulations to a file with a name formed from the name of this document appended with *_simeval_outsider_integration*

- API Map section to a file with a name formed from the name of this document appended with *_simeval_api_map*

- Schedule of Work section to a file with a name formed from the name of this document appended with *_simeval_schedule_of_work*

- Codifying Simulations section to a file with a name formed from the name of this document appended with *_simeval_codifying_simulations*

- The text portion from the beginning of this document to the beginning of Codifying Simulations to a file with a name formed from the name of this document appended with *_simeval**_theory*

This chapter as-is should be transferred to *instruction_documents* and the structure (hierarchical header leveling) should be written to a table of contents, serving as a pseudo-index for topics. Preference is agents should take read segmented texts over the entire source after bootstrapping is completed (a point to emphasize in the *instruction_documents *index file).

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
│   │   ├── <this document's file name>_simeval_tasker_prompt.md
│   │   ├── <this document's file name>_simeval_implementer_prompt.md
│   │   ├── <this document's file name>_simeval_packager_prompt.md
│   │   ├── <this document's file name>_simeval_outsider_prompt.md
│   │   ├── <this document's file name>_simeval_aligner_prompt.md
│   │   ├── <this document's file name>_simeval_optimizer_prompt.md
│   │   └── index.md
│   ├── <this document's file name>_simeval_master_prompt_important.md
│   ├── <this document's file name>_simeval_bootstraps.md
│   ├── <this document's file name>_simeval_repository_structure.md
│   ├── <this document's file name>_simeval_code_structure.md
│   ├── <this document's file name>_simeval_API_map.md
│   ├── <this document's file name>_simeval_codifying_simulations.md
│   ├── <this document's file name>_simeval_theory.md
│   ├── <this document's file name>_simeval_implementation_guidelines.md
│   ├── <this document's file name>_simeval_outsider_integration.md
│   ├── <this document's file name>_simeval_schedule_of_work.md
│   ├── <this document's file name>_simeval_table_of_contents.md
│   ├── <this file in original form copied>.md
│   └── index.md
├── tools/
│   ├── index.md
│   ├── start.sh
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

Records are text files of the changes to be concretized. The filename should be a timestamp prepending a short title of changes and the author’s mindset. In this way, each file should obviously belong to a train of thought of a mindset.

They are write-only. Records should be thought of as compression of the description of the state of the implementation, with more information density towards recent developments. In this way, a sequence of records should indicate the path towards completeness.

#### Exceptions

The exceptions directory catalogs decisions which disagree with the spec. Exceptions give agents some latitude in execution from the spec when grossly misaligned with best practice or when conflicting instruction is encountered.

### Checks

The verifier is a script (*checks.sh*) that resides in the root directory (create this file if it does not exist). This is the access point to testing of the present artifact. All testing should be linked to the execution of the verifier script, taking care of the relative path to the artifact workspace. Running the script should validate the setup of the repository as well as artifact implementation, with an resultant output file written to a verifications directory (create if this does not exist). Each verification output file should be named with a timestamp.

## Agent Prompts

The following are specific mindsets to adopt when completing a task.

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

Important instruction documents: Schedule of Work, Codifying Simulations, Implementation Guidelines, API Map

### Packager

The packager is responsible for massaging the workspace artifact into an easily deployable state. This means in a few lines, the artifact can be up and running for an uninitiated user. As the packager follows implementation, the mindset resolves build and configuration issues as a focal point. The package produces a functional start script within the tools directory, running the product in the background and enumerating the access point.

### Outsider

The outsider mindset operates without any knowledge of the source code or spec (ignoring instruction documents besides this mindset definition and workspace source code in context). The outsider may create memories to track learnings for a consistent thought path, effectively resuming from a state of learned information. The outsider approaches sim-eval as a black box, treating only consumer facing documentation and the api as knowledge within bounds.

The outsider should identify issues of discoverability and mismatched expectations of a fresh user and convey this to an implementing mindset; documenting behavioral observations, including artifacts towards reproduction of issues and not resolving them.

Refer to the outsider integration instruction document for clarity on your specific directive.

Important instruction documents: Integration

### Aligner

The aligner is charged with comparing the spec’s directory tree with the state of the workspace, confirming or rectifying that:

- All files listed in the specs exist and are in the right place

- All business logic of implementations match the file descriptions of the specs

- There are no extra source files or directories not found in the spec

- All endpoints from the API map align with the spec

Alignment is strict, meaning filenames must match for posterity sake. Practically, if a visitor is looking for any file from the spec, that exact file should be present in the correct place in the directory.

Important instruction documents: Codifying Simulations, Repository Structure, Workspace Structure, API Map

### Optimizer

The optimizer takes a global vantage of the interoperable business logic between implementations of the spec and addressing optimizations in memory and runtime complexity, preserving behavior.

In executing optimization, prioritize run-time complexity over memory. Prioritize the functions of sim-eval while running above atomic user operations. Broadly, processes that execute continuously take precedence over processes that rely on the rarer input. Priority in this sense relates to trade-offs, not order of address.

### Master Prompt

Based on the directive and inherited context you have been given, determine your mindset (tasker, implementer, packager, outsider, aligner, optimizer), familiarize with that mindset through instruction documents and memories associated with the mindset and execute as that mindset given the state of the project. When a task is completed, explicitly hand off responsibility of progress to the appropriate mindset by writing the delegation in the final output.

# 

# Implementation Guidelines

The chapter appendix contains helpful documents for reference throughout the implementation process. The meta-level guidance is intended to reduce error (hallucinations) by enforcing the definition of intent prior to execution.

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

## Schedule of Work

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

Phase 3 — Packaging

- Implement installation and execution of the artifact

- Rectify emergent build issues

Phase 4 — Integration Design

- Implement integration script with emphasis on discoverability

- Run test and correct gaps between execution and spec until all gaps are resolved

- Produce artifacts as proof of implementation correctness

Phase 5 — Structural & Behavioral Alignment

- Check codebase against directory structure

- No described file is un-implemented

- All source code exists in the directory structure

- Descriptions of files match source code

- Check routes against API Map

- No route is un-implemented and all paths match the spec

Phase 6 — Optimization

- Inspect codebase for optimizations run-time complexity and memory and refactor, validating changes do not break behavior using the integration test


# Ch. 2. Implementing Simulations

At this point, you should have a semi-portable simeval engine with an api for initializing and running ECS patterned programs. Earlier we’ve stated the benefit of ECS in orderly environment definition through the inherent modularity of systems. How do we maximize this benefit, and what are anti-patterns that negate this benefit?

## System Design

An individual system should be limited to the smallest scope of causality possible. This is not a precise directive, as like deciding when to use interfacing in OOP. Systems can technically be discretized until they are loops of a single operation with business logic concentrated in component filtering.

Towards a common vocabulary, we’ll summarize the general structure of a system (to be clear, we’re describing parts of a for-each loop):

- Filter: the mechanism that sits at the top of a system to generate the iteration source, being all entities with certain components as the scope

- Transformation: the business logic that actions on each entity selected by the filter, propagating change in through entities and components

The transformation to action upon all these entities should compute with all these specific components and most of the business logic should be relevant to most of the entities. It is an anti-pattern to lean substantially on case logic in systems, hinting at suboptimal component definition. We should have some sense that transformations should create or modify entities and components outside of that initial filtering in order for change to propagate. It is an anti-pattern to transform the same component states multiple times in a single pass, leading to hidden states.

## Component Design

The vocabulary we’ll use to describe components:

- Type: the component type matched by the class name of a component, like a literal name of a field

- Value: the internal payload of data captured by a specific component instance, with a defined schema

Typing internal to the payload of components is an anti-pattern, being impossible to index by the ECS engine. The schema of component values being multi-parameter is an anti-pattern for the same reason. For the same amount of information captured for an entity, it is better to have more components with less data per component than to have fewer components with more data.

## Testing

Fundamentally the ECS engine was defined with object-oriented building blocks, which lends to test-driven development, given the discretized nature of inputs and verifiable outputs. TDD works well with highly vertical code as with flat architectures. With ECS implementations of world behavior, TDD is less meaningful. You can verify the behavior of individual systems with high coverage, but the canonical systems transform the environment in ways that are very noisy.

Systems may be non-commutative. This simply means a seeded environment transformed by system A and then by system B may not lead to the same state after transformation through system B and then system A. We can see this with textual builder patterns: function A appends text and function B capitalizes text. A followed by B results in a fully capitalized string, but B followed by A results in mixed casing.

### On Absolute Validation

Let’s try to approximate what perfect verification of an ECS implementation looks like. You have a seeded environment state and you have every intermediate component state from system to system until you have the state of the environment as it enters the next state. You verify that each component value is correctly transformed through the frame. This is still approximate; there very well could be multiple touches to components within a single system (anti-pattern as it is). That aside, while technically feasible, this is not practical. We’ve only verified a frame of a nearly infinite number of permutations of component values. This would certainly be unrealistic to employ in an iterative development pattern.

Testing of ECS implementations should orient around validation of causality within the environment rather than validation of behavior of code. This is analogous to code coverage; test code may be shorter or longer to achieve the same amount of coverage and there is intuition that shorter achieves coverage with less redundancy (lines of code visited). Repetitive visitation is not inherently bad, but signals testing for the sake of making sure code acts like code, that computers act like computers. Sufficiency of verification of code is measured by coverage, but coverage itself is graded against redundancy and for behavior.

Revisiting the fact that ECS was developed for modern game development we can expect some parallels in testing with frontend. Visual mediums consider smoothing of edges to be desirable, contrary to autonomous codebases which treat smoothing as obfuscation. A game that renders out-of-bounds spaces and self-recovers in a few frames or a login page that logs the user out on an operation due to an expired token is smoothing behavior, tolerable. A helper function that catches exceptions and simply returns default values is intolerable.

ECS for simulation, unlike a game engine, demands the high threshold of causal veracity as with an autonomous codebase, but cannot lean solely on unit testing and is incomplete still with additional perceptual testing strategies.

### Causal Validation

The next approach assumes simulation as leading to observations of emergent phenomena through understood phenomena. Extending this framing, emergent phenomena cannot be verified, only what is understood can be. This is useful towards accepting that the sum validity of causal transformation of each phenomenon over some time frame is as meaningful as the theoretical perfect verification over that same time frame. For our purposes, the parts of the sum are centered around components.

We can realistically formalize expectations around a component type through a time-series, given a seeded environment that includes a stimulus producing an understood change. For example, we should expect a ball’s position component to predictably be affected by forces acting upon the ball. If we had an environment defined with a system for gravitational force and seeded this environment with a ball, the frames captured by the playback of this simulation should show the ball’s descent.

In summary, validating an understood phenomenon in ECS can be achieved through:

1. Seed environment with initial conditions expected to give rise to the phenomenon

2. Run the simulation to capture environment behavior through simeval output streams

3. Verify stream data for the phenomenon

A system in isolation expresses only understood phenomena (this must be true as codification of a system is an effort of codification of phenomena). As systems are introduced to the environment, the number of phenomena within the environment grows to exceed the sum of the understood phenomena per system. With few systems, we have semi-understood phenomena, things that we can intuit, but at a certain point we begin to see emergent phenomena. The validation process enumerated above lends to a gradual process towards verifying ECS environments up to the point of semi-understood phenomena in order to build confidence in observance of emergent phenomena. In a sense, we are finding a way to “trust our eyes.”

### Boundaries of Veracity

Bluntly, validation is not fun, but unit and perception based testing is rote (in a positive sense). Unit testing is bounded by coverage and perception based testing on permutations of interaction. The causal validation approach described above is not bounded in a computational sense. It requires some heuristic understanding of the intent of a world model. The unbounded nature flows down to the implementation of tests, there is no coverage measurement nor interaction matrix.

We might attempt to define a framework or find universality through a rules based approach. If we’re validating output streams, a BRMS (business rules management system) can serve to define checks such as one-and-only-one entity definition and component lifecycles. This approach has computational scalability with modularity of condition definitions. While a rules engine is attractive for these reasons, BRMS mismatches where conditional statements in simulation are too dimensionally rich. We are back to wrangling the absolute validation problem.

Despite the impracticality of BRMS for simulation, we can observe rule definition is very tractable. Similar to behavioral testing’s “when I click this, then I should observe this,” we can define “when this happens, then I should observe this.” To align with simulation space:

“With an environment state A, through the passage of time T, we should observe event(s) E.”

BRMS as a compilation engine for the evaluator of the statement is impractical, but it is trivial to define these types of statements; from what can be described comes what is understood. Further, their definition sums to the edge of semi-understood phenomena (which is as far as we need to achieve).

Towards grounding our thoughts we’ll formalize expectations of a validation design pattern that scales:

- Semi-structured natural language statements are constructed to define understood phenomena

- Statements are codified as verifiers which consume frames from a simulation run

- Updates to the world model which should reflect the same understood phenomena re-use the same verifiers

And we’ll proceed to define agentic instructions to generally implement simulations before returning to the ball physics problem for a concrete test against the assumptions of this section.

# Agentic Instructions

This section is intended for consumption by a coding agent to first localize knowledge from within this document to a filesystem context towards implementation of a specific world model. This world model is to be expressed as plugins of components and systems to use within simeval. The instructions proceed to define a verification strategy to serve as evolving guardrails for iterative development.

## Bootstraps

Using this chapter, Implementing Simulations, as source material, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

- Bootstraps section to a file with a name *impl_bootstraps*

- Repository Structure section to a file with a name *impl_repository_structure*

- A *mindset_prompts* directory containing:

- Tasker section of Agent Prompts section to a file with a name formed from the name of this document appended with *_tasker_prompt*

- Master Prompt section to a file with a name *impl_master_prompt_important*

- The text of this chapter prior to Agentic Instructions, Implementing Simulations, to a file with a name formed from the name of this document appended with *_theory*

This chapter as-is should be transferred to *instruction_documents* and the structure (hierarchical header leveling) should be written to a table of contents, serving as a pseudo-index for topics. Preference is agents should take read segmented texts over the entire source after bootstrapping is completed (a point to emphasize in the *instruction_documents *index file).

# Problems

Before approaching specific applications of sim-eval, we should define what qualities of problems uniquely benefit from simulation.

### Analytical Intractability

We can intuit there are problems that are (or are more) *non-solvable*. In a mathematical sense, a system of equations where the values of the variables cannot be derived does not have a closed-form solution. The problem is *analytically intractable*. In control theory terms, the problem is *time-variant*, *nonlinear*.

### Computational Representability

At the same time, we can see problems that can be represented precisely as systems of equations can bear more sufficient solutions. So, problems with less *unknown unknowns* are more *computationally representable*; the closer a model’s formal components mirror the underlying causal reality described, the more valid and predictive the model is.

For our purposes, analytically tractable problems are a subset of computationally representable problems, but a problem that is analytically tractable lends to deterministic solvers (a calculator is especially suited for solving arithmetic). Problems suited for simulation are both analytically intractable and computationally representable.

### Topology of Questions

Questions are formed of a specific objective and intent to discover causal values of levers towards achieving that objective. Simulation is used to search for the specific objective from the universe of possible forms of the objective. Each path of this search, a single permutation of the effecting values is effectively a hypothetical (and hypotheticals can be simulated).

Effectively we’re describing a flow: questions suggest some conceptual space for *levers*, another space for *objectives* and between them a space for *paths* from levers to objectives. A heuristics-based approach, through domain knowledge, can produce a path that is more efficient than exhaustive permutation sweeps and rigid calculation. To summarize the three conceptual spaces:

Levers travel on paths towards objectives.

If asked to sum two large numbers, 390234 and 512983, rather than starting with the least-significant digits and carrying over, we can intuit the first number is close to 400000 and the second 500000. We can sense the answer is around 900000. In this example, the addends exist in the conceptual space of levers, the summation operator exists in the paths, and the sum in that of objectives.

The above example is illustrative of how the topology works, we can agree it’s pedantic; the problem is unsolved. In defense of the topology, this is because the problem is analytically tractible. To allay skepticism, let’s approach a question where we work *backwards*.

## Maze Problem

We’ll pose a case that maps well to our topology while being more practical: a maze. Suppose you had an environment that is a flat maze. This maze can be represented as a coordinate system where movement in the vertical or horizontal plane is possible or impossible. A traverser is placed in the maze and knows there is a target somewhere in the maze.

Within the conceptual space of paths are the literal paths to the target. It includes the strategies to find the path. The conceptual space of levers includes decisioning parameters to the strategies, such as turn selection. The space of objectives includes the target endpoint and requirements that distinguish the success of different strategies and parameters, such as step count.

#### Dart Search

Starting with a question that is opaque to a non-technical audience and trivial to others with domain knowledge (Case 1):

**What coil and core geometry produces a uniform 0.5 T magnetic field within a 30 mm cubic target volume while minimizing copper loss and core mass?**

Without domain knowledge, we can recognize:

1. The solution is a description of “coil and core geometry”

2. The solution is validated by producing “a uniform 0.5 T magnetic field within a 30 mm cubic target volume” in some representational form

3. The best solution of all possible solutions minimizes “copper loss and core mass”

*To be clear, what we’d consider the solution to the problem is not pointing at the objective space in our topology. The solution is not the objective, rather the solution pertains to the space of levers.*

1 and 3 pertain to the conceptual space of objectives. 2 pertains to the space of paths; how we validate a solution is a path through which the solution is derived. The solution space is constrained by all possible forms of coil and core geometry. This informs the path space as being constrained to all paths that can lead to a description of coil and core geometry. The path selected informs the levers. Holding selection within one of the three conceptual spaces limits selection space of the nearest, and calcifies the form of the third.

We’ll start with a strategy that naively takes LLM responses and look to refine the solution with a multi-dimensional search through the solution space. To start, we’ll name the levers and enumerate how they are represented to capture coil and core geometry.

| Lever | Representation |
|---|---|
| Geometry family | c-yoke, h-yoke, or helmholtz |
| Pole profile | flat, Rogowski, or custom spline |
| Gap | meters |
| Pole diameter | meters |
| Pole profile radius | meters |
| Yoke cross-section | meters2 |
| Yoke path length | meters |
| Core material | low carbon steel, silicon steel, NiFe, or ferrite |
| Turns | count |
| Current | Amperes |
| Wire cross-section | meters |
| Winding pack factor | multiplier |
| Coil axial length | meters |
| Coil radial thickness | meters |
| Cooling method | natural convection, forced air, or liquid |

**Table 1.1**: Representing levers in Case 1

This proposition for the values of the levers is generated by an LLM (Soln. 1.1):

| Lever | Value |
|---|---|
| Geometry family | c-yoke |
| Pole profile | Rogowski |
| Gap | 0.030 |
| Pole diameter | 0.070 |
| Pole profile radius | 0.035 |
| Yoke cross-section | 0.0013 |
| Yoke path length | 0.25 |
| Core material | low carbon steel |
| Turns | 400 |
| Current | 25 |
| Wire cross-section | 6x10-6 |
| Winding pack factor | 0.60 |
| Coil axial length | 0.10 |
| Coil radial thickness | 0.022 |
| Cooling method | forced air |

**Table 1.2**: Lever values to solve Case 1
