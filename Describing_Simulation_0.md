# Describing Simulation

Key reference sections are now maintained in [instruction_documents/index.md](instruction_documents/index.md).

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
