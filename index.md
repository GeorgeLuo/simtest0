# Repository Overview

## Purpose
This repository curates the "Describing Simulation" materials that outline a methodology for translating natural language hypotheticals into executable simulations. The documents capture theoretical framing, codification practices, and supporting prompts for agents tasked with simulation design.

## Directory Layout
- `Describing_Simulation_0.md`: Entry point that introduces the Describing Simulation manuscript and links to the detailed instruction documents.
- `index.md`: High-level orientation document (this file).
- `AGENTS.md`: Working conventions for contributors updating these materials.
- `instruction_documents/`: Location referenced by the main manuscript for sectioned instruction files (consult upstream sources if the directory is omitted in a given checkout).

# Verification Guide

## Running the verifier

Use the `verifier` script in the repository root to capture test output in a timestamped log.

```bash
./verifier
```

By default the script runs a placeholder command and reminds you to add the real test invocation. Pass the actual test command as arguments when you are ready to hook it up:

```bash
./verifier pytest
./verifier npm test
```

Each run writes its output to `verifications/verification-<timestamp>.log`, making it easy to review the results of previous verification attempts.

## Next Steps
For a full dive into the framework, continue with [`Describing_Simulation_0.md`](Describing_Simulation_0.md).