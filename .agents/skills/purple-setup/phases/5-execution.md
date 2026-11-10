# Phase 5 — Execution

Build:
- Goals: one objective → milestones, each with acceptance criteria written before work starts (requirements, design, build, integrate, test, security, deploy, verify). The goal closes only when phase 3's verifier passes every criterion.
- Task graph: tasks with `needs: [...]`; a task whose prerequisites are not done refuses to start and names the blocker.
- Durable jobs: long commands run under a job registry (`purple/jobs.jsonl`: id, cmd, pid/unit, log path, started, status), as systemd user units or detached processes, so they outlive the session; the next session lists them on start.
- File claims: an agent claims the files it will edit; a second agent sees the claim before touching them.

Proof: a task with an unmet dependency refuses to start; a 5-minute job started in session A is still running and reported in session B.
