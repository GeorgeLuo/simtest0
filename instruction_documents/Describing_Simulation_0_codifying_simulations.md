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
