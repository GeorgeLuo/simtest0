### Code Structure

```text
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

