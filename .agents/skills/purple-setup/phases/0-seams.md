# Phase 0 — Seams

Goal: know where each later phase plugs in before writing any code.

1. Read `docs/capability-seams.md`, `docs/tool-catalog.md`, `docs/module-graph.md`, `docs/event-producer-consumer.md`.
2. For each hook below, find the service or package and the file that owns it:
   tool-call interception (before/after), turn end, session start/end, subagent spawn, model call, plugin load/HMR, skill registry, event bus.
3. Write `purple/SEAMS.md`: one line per hook — hook, `ctx.<service>`, file path, how a plugin registers.

Proof: every line names a file that exists (`test -f` each path). Unknowns written `TODO: confirm`, never guessed.
