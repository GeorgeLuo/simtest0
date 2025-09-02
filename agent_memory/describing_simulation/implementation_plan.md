# Implementation Plan

1. **Primitives**
   - Define Entity as a unique identifier without intrinsic dimensions.
   - Create ComponentType with unique runtime identity and data contracts.
   - Implement EntityManager to track entities and remove associated components.
   - Implement ComponentManager to manage components and their links to entities.
2. **System**
   - Create stateless systems that mutate environment via managers and expose update hooks.
3. **Time**
   - Add TimeComponent storing elapsed time from simulation start.
   - Add TimeSystem to create a time entity and increment its component each cycle.
4. **Outbound Messaging**
   - Provide OutboundMessageBus with a single orchestrator listener.
   - Implement OutboundMessageSystem to emit messages then flush entities.
   - Use OutboundMessageComponent and OutboundMessageType for payloads and exit signals.
5. **Condition Evaluation**
   - Implement ExitConditionComponent capturing experiment end data.
   - Implement ExitConditionSystem to evaluate exit conditions and trigger termination.
6. **Orchestration**
   - Build ECS orchestrator to initialize managers and run the systems loop.
