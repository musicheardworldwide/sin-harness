# Phase 3 — Verification (claiming done ≠ proving done)

Build:
- Each project declares checks (typecheck, tests, build) in one file, e.g. `purple.json` → `checks`.
- After-edit hook runs the cheap ones and feeds failures straight back into the turn.
- Turn-end gate: the agent cannot end with "done" while any declared check is red or files outside the task's scope changed (`git diff --stat` vs the task's file list).
- Verifier: a separate read-only subagent, ideally a different model, given the original request and the diff — not the builder's summary. Returns pass/fail with evidence. Doc drift (changed API, stale README) is one of its checks.

Proof: plant a failing test; the harness refuses to finish. Fix it; the verifier passes with the test output as evidence.
