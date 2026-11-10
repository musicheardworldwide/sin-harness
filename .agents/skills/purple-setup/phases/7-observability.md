# Phase 7 — Observability

Build:
- Environment snapshot at session start: OS, kernel, CPU/RAM, GPU + free VRAM, Python/Node versions, key packages, containers, services, disk free. Diff against the last good snapshot; show drift.
- Budget meter: tokens and cost per task and per model, visible to the agent mid-task, with a per-goal cap that pauses at the limit.
- Health sweep (scheduled): failing tests, dependency CVEs, disk, failed jobs, dead services → a score per project and maintenance tasks into the task graph.

Proof: bump a package version; the next session reports it as drift. Set a tiny budget cap; the task pauses at it.
