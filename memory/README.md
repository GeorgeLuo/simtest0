# Memory Knowledge Base

The `memory/` directory is the shared knowledge base for Simulation 0. It preserves
context that outlives a single coding task and keeps the reasoning trail behind
implementation decisions accessible to future contributors.

## Directory layout

- `ways/` &mdash; long-lived heuristics, principles, and "rules of thumb" that have
  proven useful and should guide future work.
- `records/` &mdash; timestamped progress notes that document the current state of a
  task, research session, or investigation.

## Authoring flow

1. Capture day-to-day discoveries, open questions, and decisions inside a new
   record under `records/`.
2. When a pattern keeps reappearing or a record establishes a durable lesson,
   promote it into a dedicated way under `ways/` and link the source records.
3. Update existing entries as understanding evolves so the most recent
   perspective is always obvious to the next reader.

## Naming conventions

- All entries use Markdown (`.md`).
- Ways use short, descriptive, kebab-case filenames that identify the enduring
  principle (for example, `api-contract-triage.md`).
- Records are timestamped using `YYYY-MM-DD--HHMM-topic.md` so that chronological
  sorting matches the git history (for example, `2024-05-12--1430-schema-sync.md`).

## Write and delete policies

- Prefer editing an existing file over creating duplicates for the same topic;
  summarize what changed in a dedicated *Revision History* section inside the
  file.
- Do not delete ways or records once published. If guidance becomes obsolete,
  mark it as `Deprecated` inside the document and explain the replacement.
- Corrections should be added as follow-up entries instead of amending past
  statements. Use inline notes such as `**Update (2024-05-12):** …` so the
  evolution remains visible.

Refer to the READMEs in `ways/` and `records/` for templates that illustrate how
individual entries should be structured.
