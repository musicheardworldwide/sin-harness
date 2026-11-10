# Phase 1 — Governance (first, because everything else runs under it)

Build:
- `policy.yaml` with tiers: auto (read, safe diagnostics), policy (edit project files), approve (install deps, system config, network beyond the model API), explicit (credentials, deploy, destructive). Match on tool + argument pattern.
- A before-tool-call plugin that reads the policy and allows, refuses, or parks the call in an approval queue (JSONL: id, tool, args, reason, status).
- A deny list that no tier lifts: production hosts (ionos-s4), `git push`, `rm -rf` outside the workspace, reading `.env*`, keys.
- Approve/reject/pause from one place (Web UI panel or a CLI that edits the queue; Telegram later).

The policy file and plugin are mounted read-only from the host. Purple can propose changes in STATE.md; it cannot make them.

Proof: (a) a denied command returns a refusal and runs nothing; (b) an approve-tier command waits, then runs after approval; (c) an attempt to write `policy.yaml` is refused.
