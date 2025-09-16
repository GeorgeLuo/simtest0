# Ways Directory

The `ways/` folder captures durable heuristics and operating principles that
should guide future contributors. Each file distills a lesson that has matured
beyond a single task or experiment.

## When to create or update a way

- Promote a concept from `memory/records/` once it has proven reliable across
  multiple records or decisions.
- Update an existing way whenever the guidance changes. Add a dated note to the
  *Revision History* section instead of rewriting the past.
- Only mark a way as deprecated when it actively conflicts with current
  practices; leave the document in place with a pointer to the successor.

## File naming conventions

- Use lowercase, kebab-case filenames that summarize the principle, such as
  `structured-playbook-updates.md` or `api-compatibility-checklist.md`.
- Avoid timestamps in the filename; the guidance should be timeless. Track
  creation dates inside the file instead.

## Recommended structure

Author each way in Markdown using the template below. Replace the placeholders
in angle brackets with the appropriate content.

```markdown
# <Concise way title>
- **Status:** Active | Reviewing | Deprecated
- **Created:** YYYY-MM-DD
- **Source records:** [YYYY-MM-DD--HHMM-topic](../records/YYYY-MM-DD--HHMM-topic.md)
- **Last reviewed:** YYYY-MM-DD

## Guidance
- Key instruction or principle.
- Additional clarifications that keep future work aligned.

## Signals
- Evidence that tells a contributor when this way applies.
- Warning signs that a different approach is required.

## Revision history
- YYYY-MM-DD — Summary of what changed and why.
```

## Writing and deletion policy

- Keep ways succinct and actionable; link to deeper research or rationale if
  needed, but avoid duplicating entire records.
- Never delete a way outright. If a principle is replaced, update the **Status**
  to `Deprecated` and reference the document that supersedes it.
- When editing, explain the reason for the change in the **Revision history**
  section so readers can track the evolution at a glance.
