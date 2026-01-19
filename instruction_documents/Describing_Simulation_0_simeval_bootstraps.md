## Bootstraps

This document will serve as the source of truth for task generation. Bootstrapping is a process that is independent of generation of the sim-eval codebase itself. For context management, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

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

- The text portion from the beginning of this document to the beginning of Codifying Simulations to a file with a name formed from the name of this document appended with *_simeval_theory*

This file as-is should be transferred to *instruction_documents* and the structure (hierarchical header leveling) should be written to a table of contents, serving as a pseudo-index for topics. Preference is agents should take read segmented texts over the entire source after bootstrapping is completed (a point to emphasize in the *instruction_documents *index file).

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
│   ├── <this document's file name>_simeval_api_map.md
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
│   ├── cli/
│   │   └── simeval_cli.js
│   └── dev/
│       ├── start.sh
│       └── run_integration.sh
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
