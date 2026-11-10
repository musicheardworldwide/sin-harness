# Phase 6 — Intelligence

Build:
- Context loader: for a task, pull the relevant files (embedding model + import graph), project rules, past decisions and recent errors from the journal — bounded, with paths to fetch more. Refuse an edit to a file the agent has not read this session.
- Impact check: before editing a file, list importers, tests that cover it and other projects that share it; attach a one-line risk to the approval request when the tier needs one.
- Error diagnosis: on a failed command, capture output and context, look up the journal for the same error, propose a fix, apply only within the agent's tier, rerun. Cap at 3 tries, then escalate (phase 4) and record the resolution.

Proof: editing a shared module prints its dependents before the edit; a known error (seeded in the journal) is fixed on the first retry.
