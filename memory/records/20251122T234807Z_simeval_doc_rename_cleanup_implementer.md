# Task Record — Simeval doc rename cleanup

## Summary
- Implementer mindset: confirmed simeval-prefixed instruction set is complete and removed legacy non-simeval extracts/prompts per rename requirement.
- Updated references so active scripts/docs point to the new simeval filenames.

## Actions
- Added `instruction_documents/Describing_Simulation_0_simeval_workspace_structure.md` to cover the workspace guidance under the new naming.
- Updated AGENTS, checks.sh, tools run instructions, workspace README/info pages, and main API metadata to reference simeval documents.
- Pruned legacy instruction extracts and mindset prompts (`instruction_documents/Describing_Simulation_0_*.md`, `instruction_documents/mindset_prompts/Describing_Simulation_0_*.md`) now superseded by simeval variants.

## Validation
- `rg --pcre2 "Describing_Simulation_0_(?!simeval).*\.md" --glob '!memory/**'` shows no remaining references to removed filenames outside memory records.
