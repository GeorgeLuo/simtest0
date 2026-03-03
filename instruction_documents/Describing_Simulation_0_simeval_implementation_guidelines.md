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
   └─ Join (Skeletons \+ Test Intents) → Actual tests

Stage 4: Implement Logic  
   └─ Fill skeletons to satisfy tests

Stage 5: Validate  
   └─ Run tests → Errors → Iterate until green

## Schedule of Work

Phase 1 — Bootstrapping

* Prepare repository structure as described in Bootstraps.  
* Split this document into component instruction files.  
* Create or update index.md and AGENTS.md for visibility.  
* Ensure tools/, workspaces/, and memory/ directories exist.

Phase 2 — Artifact Creation

* Enter the workspace for the current revision.  
* Proceed through checkpoints in order.  
* Each checkpoint represents a coherent milestone, building on prior ones.  
* For each checkpoint:  
  * Define skeletons (structure, empty methods).  
  * Write test intents (comment-only).  
  * Codify tests from intents.  
  * Implement logic to satisfy tests.  
  * Validate until all tests pass.

Phase 3 — Packaging

* Implement installation and execution of the artifact  
* Rectify emergent build issues

Phase 4 — Integration Design

* Implement integration script with emphasis on discoverability  
* Run test and correct gaps between execution and spec until all gaps are resolved  
* Produce artifacts as proof of implementation correctness

Phase 5 — Structural & Behavioral Alignment

* Check codebase against directory structure  
  * No described file is un-implemented  
  * All source code exists in the directory structure  
  * Descriptions of files match source code  
* Check routes against API Map  
  * No route is un-implemented and all paths match the spec

 Phase 6 — Optimization

* Inspect codebase for optimizations run-time complexity and memory and refactor, validating changes do not break behavior using the integration test

