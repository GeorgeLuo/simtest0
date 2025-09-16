## Bootstraps

This document will serve as the source of truth for task generation. For context management, we will divide and store as files into a directory of root, *instruction_documents* (create if this does not exist):

- Bootstraps section to a file with a name formed from the name of this document appended with *_bootstraps*

- Master Prompt section to a file with a name formed from the name of this document appended with *_master_prompt* 

- Codifying Simulations section to a file with a name formed from the name of this document appended with *_codifying_simulations*

- The text portion from the beginning of this document to the beginning of Codifying Simulations to a file with a name formed from the name of this document appended with *_theory*

Review and create an index for the *instruction_documents* directory describing the contents of the directory.

Create instructions for future visitors to review the latest version of this document in a high visibility location (eg. AGENTS.md). We can see that bootstrapping is a process that is independent of generation of the artifact itself. To be clear, the term artifact refers to the manifestation of the descriptions within Codifying Simulations.

```
/
├── <this document's file name>.md
├── AGENTS.md
├── checks.sh
├── instruction_documents/
│   ├── <this document's file name>_theory.md
│   ├── <this document's file name>_bootstraps.md
│   ├── <this document's file name>_codifying_simulations.md
│   └── index.md
├── tools/
│   └── index.md
├── workspaces/
│   └── <this document's file name>/
├── verifications/
└── memory/
    ├── ways/
    └── records/
```
Using the above as a guide for bootstrapping, we’ll enumerate how the layout is constructed.

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

Records are text files of the changes to be concretized. The filename should be a timestamp prepending a short title of changes. They are write-only. Records should be thought of as compression of the description of the state of the implementation, with more information density towards recent developments. In this way, a sequence of records should indicate the path towards completeness.

### Checks

The verifier is a script (*checks.sh*) that resides in the root directory (create this file if it does not exist). This is the access point to testing of the present artifact. All testing should be linked to the execution of the verifier script, taking care of the relative path to the workspace. Running the script should validate the setup of the repository as well as artifact implementation, with an resultant output file written to a verifications directory (create if this does not exist). Each verification output file should be named with a timestamp.

