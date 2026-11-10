# Phase 2 — Continuity

Build:
- Event journal: append-only `purple/journal.jsonl` — ts, session, agent, event (task_start, file_edit, cmd, test_fail, dep_install, config_change, deploy), resource, result. Written by the after-tool-call hook, not by the model.
- Checkpoints: before any approve/explicit-tier action or multi-file edit, `git commit` to a `purple/checkpoints` ref (or `git stash create`). Rollback = restore that ref.
- Project state: `purple/projects/<id>.md` — decisions, done, known problems, failed approaches, next. Updated at session end from the journal; wire into the existing memory plugin instead of a new store.

Proof: start a 3-step task, kill the session after step 1, start a new one: it reads the journal and continues at step 2 without re-asking. Then roll back one checkpoint and diff shows the files restored.
