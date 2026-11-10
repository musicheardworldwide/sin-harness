---
name: purple-setup
description: Use when building or extending Purple Harness on this DSH fork — the governance, continuity, verification, agent, execution, intelligence and observability plugins. Builds one phase at a time in dependency order, each ending in a proof, and records progress in purple/STATE.md so any session can resume.
---

# Purple Harness setup

Purple is the operating environment; models are workers inside it. Every feature is a DSH plugin or module, never a prompt rule: if the model can ignore it, it is not built.

## Before anything

1. Read `purple/STATE.md`. If it exists, resume at the first phase not marked `done`. If not, create it from the table below with every phase `todo`.
2. Read only the phase file you are about to work on (`phases/<n>-*.md`). Do not load the others.

## Rules for every phase

- **One phase per session**, in order. A phase depends on the ones above it; never start a later one early.
- **A phase is done only when its proof passes**, run by a fresh verifier, not the agent that built it. Paste the proof command and its result into `STATE.md`.
- **Never edit what governs you.** The policy file, deny list and verifier live outside your write reach (mounted read-only from the host). If a phase needs them changed, stop and write the request into `STATE.md` under `## Needs Wes`.
- **Small and boring.** Append-only JSONL beats a database; git beats a custom snapshot store; a shell check beats a model judgement.
- **Stop** after two failed attempts at the same proof: record what failed and why, mark the phase `blocked`.

## Phases

| # | Phase | Builds | Proof (summary) |
|---|---|---|---|
| 0 | Seams | map of where plugins hook | `purple/SEAMS.md` names a real file for every hook below |
| 1 | Governance | permission tiers, deny list, approval queue | a denied command is refused; an approval-tier action waits |
| 2 | Continuity | event journal, checkpoints, project state | kill a session mid-task; a new one resumes from the journal |
| 3 | Verification | post-edit checks, stop gate, verifier agent | a planted failing test blocks "done" |
| 4 | Agents | roles, model router, escalation, backend adapters | a read-only role cannot write; a stuck small model escalates |
| 5 | Execution | goals → milestones, task deps, durable jobs | a blocked task refuses to start; a job survives session close |
| 6 | Intelligence | context loader, impact check, error diagnosis | an edit to a shared file lists its dependents first |
| 7 | Observability | env snapshot + drift, budget meter, health | a changed package version shows as drift |

Already present, do not rebuild: memory, Telegram, clock, embedding model, decisions model. Wire into them.

## STATE.md shape

```
# Purple state
| # | phase | status | proof | date |
## Needs Wes
## Notes for next session
```
