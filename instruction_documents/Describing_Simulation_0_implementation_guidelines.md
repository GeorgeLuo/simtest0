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

