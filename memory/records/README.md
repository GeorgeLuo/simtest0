# Records Directory

The `records/` folder stores chronological notes about active work, research
threads, and short-term decisions. Treat each record as a snapshot of what was
known at a specific moment so future contributors can reconstruct the context of
past changes.

## When to create a record

- Log the start and end of focused work sessions, experiments, or meetings.
- Capture unanswered questions and link them to follow-up issues or commits.
- Summarize any decision that might influence future work, even if it feels
  provisional.

## File naming conventions

- Name records using `YYYY-MM-DD--HHMM-topic.md`. The timestamp should be in
  24-hour time and reflect when the note was created or the session ended.
- Keep the topic slug short, lowercase, and hyphen-separated (for example,
  `2024-05-12--1430-schema-sync.md`).
- If multiple notes are created in the same minute, append a differentiator such
  as `-a`, `-b`, etc. (for example, `2024-05-12--1430-schema-sync-b.md`).

## Recommended structure

Author each record in Markdown using the template below. Replace placeholders in
angle brackets before committing the file.

```markdown
# <YYYY-MM-DD HH:MM> <Short description>
- **Author:** <Name or GitHub handle>
- **Related ways:** [way-title](../ways/way-title.md) (optional)
- **Linked work:** PR #, issue, or commit reference (optional)

## Context
Briefly explain what prompted the work or investigation.

## Findings
- Bullet the key observations, decisions, or blockers.

## Next steps
- Enumerate follow-up actions or questions.
```

## Writing and deletion policy

- Append updates by creating new records rather than editing past ones; if you
  must clarify a previous entry, add an **Update** subsection with the current
  date.
- Never delete records. If a note was created by mistake, add a short correction
  at the top explaining why it is no longer relevant.
- Link forward whenever possible so readers can follow the trail into commits,
  issues, or newer records.
