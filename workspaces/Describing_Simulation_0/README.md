# Describing Simulation Workspace

This workspace now houses the initial scaffolding for an entity-component-system (ECS) simulation engine. The intent is to
provide strongly typed extension points that future agents can implement without redefining the overall structure.

## Source Layout

```
src/
└── ecs/
    ├── Player.ts
    ├── components/
    │   ├── ComponentManager.ts
    │   ├── ComponentType.ts
    │   └── implementations/
    │       ├── TimeComponent.ts
    │       └── plugins/        # reserved for agent-defined component types
    ├── entity/
    │   ├── Entity.ts
    │   └── EntityManager.ts
    ├── messaging/
    │   ├── Bus.ts
    │   ├── MessageHandler.ts
    │   └── handlers/
    │       ├── inbound/
    │       │   ├── InboundHandlerRegistry.ts
    │       │   └── implementations/
    │       │       ├── InjectEntity.ts
    │       │       ├── Pause.ts
    │       │       ├── Start.ts
    │       │       ├── Stop.ts
    │       │       └── plugins/ # reserved for agent-defined inbound handlers
    │       └── outbound/
    │           └── implementations/
    │               ├── Acknowledgement.ts
    │               ├── Frame.ts
    │               └── plugins/ # reserved for agent-defined outbound handlers
    └── systems/
        ├── System.ts
        ├── SystemManager.ts
        └── implementations/
            ├── TimeSystem.ts
            └── plugins/        # reserved for agent-defined systems
```

All core files declare abstract base classes or interfaces without implementation so downstream work can specialize behavior.
Plugin directories intentionally contain a `.gitkeep` file to preserve the folder structure for future additions.

## Testing Conventions

The `tests/` directory contains comment-only specifications that describe the behaviors we expect from entities, components,
and systems. These serve as prompts for future test implementations following the staged workflow outlined in the codifying
document.
