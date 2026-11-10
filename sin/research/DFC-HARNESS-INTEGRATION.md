# DFC × Sin Harness — integration plan (v2)

Supersedes §3 of [DFC-HARNESS-BRIEF.md](DFC-HARNESS-BRIEF.md). Written after reading
`musicheardworldwide/dfc` (private, cloned to `/workspace/research/dfc`).

## 1. The discovery: the seam already exists

DFC's coordinator already runs the fighters, in-process, through one interface:

```
src/match-server/src/agents/agentDriver.ts

export interface AgentDriver { run(): Promise<void>; stop(): void }
```

`createAgentDriver()` is a 330-line loop: LLM call → regex-parse `COMMAND: <shell>` → `ssh.exec()`
→ push output to history → repeat. Every turn it opens a fresh SSH channel, keeps a 20-turn
sliding window, caps output at 8 KB, one command per turn, 200 turns max, 2 s minimum interval.

Everything around it is already decoupled behind `EventLogger` (`events/eventSink.ts`):

- **recording** — JSONL recorder
- **commentary** — LLM ring announcer (`commentary/`)
- **health** — HP tracker, keys on `agent_command` (`health/healthTracker.ts`)
- **spectator** — maps five agent events to terminal kinds (`spectator/terminalBroadcaster.ts`)
- **win** — flag capture validation (`win/`)

So replacing the brain is a **one-factory swap** in `agentOrchestrator.buildDriver()`: build a
`HarnessAgentDriver` instead of `createAgentDriver`. Nothing downstream changes.

That is the whole opportunity: the arena, economy, anti-cheat, commentary, recording, and
spectator surfaces are done. The fighter is a `while` loop with a regex.

## 2. What the current loop gives up

| Limitation (today) | Consequence | What a harness brings |
|---|---|---|
| One command per turn, parsed from prose | Slow; brittle on model quirks (there is a DeepSeek-specific regex) | Native tool calls, multi-step per turn |
| Fresh SSH channel each exec | `cd`, env, background jobs lost between turns | Persistent PTY / remote provider |
| 20-turn sliding window, no compaction | Long fights forget the target map | Compaction + durable session log |
| 8 KB output cap, 120 s timeout | Scans truncated; agents re-run them | Bounded spill + structured results |
| No file tools, no search | Everything through `cat`/`grep` strings | Native read/write/grep over the arena |
| No planning, no scratchpad | No strategy across a 45-minute match | Plan mode, todos |
| Text-parsed `SUBMIT_FLAG` | Flag can leak into reasoning text | A real `capture_flag` tool |
| Nothing recorded beyond emitted events | Replay is a summary, not a reconstruction | Session log is the recording |

## 3. Target architecture

```
match-server (coordinator)
  └─ agentOrchestrator.buildDriver()          ← one factory decision
       ├─ legacy: createAgentDriver()          (kept behind a flag during rollout)
       └─ dsh:    createHarnessDriver()
                    ├─ per-slot DSH_HOME       isolate session, profile, recording
                    ├─ generated patch         player prompt + briefing + model route + budget
                    ├─ spawn: dsh --profile gladiator --json "<briefing>"
                    ├─ parse NDJSON  ────────▶  EventLogger  (unchanged fan-out)
                    └─ capture_flag tool ─────▶  onFlagSubmit(flag)   (unchanged path)

gladiator container  ◀── ssh2 persistent channel ── dsh-arena plugin (arena_exec tool)
```

The brain stays **outside** the arena. That is forced by the design, not preference: the
container's egress firewall permits only the coordinator and the opponent, so an in-box agent
could not reach its model API. DFC got this right; the harness must not fight it.

### 3.1 Event mapping (`--json` → `EventLogger`)

| DSH NDJSON | DFC event | Notes |
|---|---|---|
| `status{turn_start}` | `agent_turn_start` | |
| `thinking` | `agent_reasoning` | spectator caps to 200 chars already — the flag-leak control stays |
| `tool_call` (`arena_exec`) | `agent_command` | command text; exit code filled on result |
| `tool_result` | `agent_command` completion | stdout/stderr → `output`, capped as today |
| `tool_call` (`capture_flag`) | — | calls `onFlagSubmit`; coordinator validates |
| `text` | `agent_reasoning` (or `narration`) | final prose |
| `status{turn_end}`, `final` | `agent_turn_end` | |
| `error` | `agent_error` | keeps the forfeit path working |

The five event names the spectator and health code consume stay byte-identical.

### 3.2 The `dsh-arena` plugin (new work in `sin-harness`)

One Cordis plugin, mounted by the `gladiator` profile:

- `arena_exec` — persistent ssh2 channel, cwd tracking, env, 120 s default timeout,
  bounded output (spill to a file the agent can read rather than truncate silently),
  structured `{stdout, stderr, exitCode}`.
- `capture_flag` — typed tool; validates `DFC{[0-9a-f]{32}}` shape locally, submits once,
  reports the coordinator's verdict; never echoed into reasoning.
- `arena_read` / `arena_write` / `arena_grep` — optional second pass, or reuse `arena_exec`.
- A prompt section: rules of engagement, flag format, the opponent's address, budget, and
  "you may only touch the assigned opponent".
- No host filesystem, no web, no subagents in v1.

### 3.3 The `gladiator` profile

Bundled in `sin-harness`, based on `headless` (no GUI, no ports), with: persona + instructions,
time-context, arena plugin, todo/plan, aggressive compaction, guard/timeout-policy, and the
model route supplied per match. Per-slot `DSH_HOME` keeps sessions isolated and makes the
session log the per-slot recording.

## 4. Rollout

| Phase | Work | Risk |
|---|---|---|
| 0 | Driver skeleton + NDJSON mapping behind `AGENT_RUNTIME=dsh`; legacy default | none — dead code |
| 1 | `dsh-arena` plugin + `gladiator` profile; run one slot against a live test container | contained |
| 2 | Full match on a dev coordinator; compare turns, time-to-capture, tokens vs legacy | contained |
| 3 | Default to DSH for new matches; keep legacy for one release | reversible via flag |
| 4 | Delete the regex parser and the single-command loop | after a clean window |

Phase 0 is the smallest thing that proves the seam. Phase 1 is the real work.

## 5. Open decisions

1. **Where the child runs** — coordinator process (matches today, simplest) or on the node
   (aligns with ADR-004's in-repo Rust node, but weights the node image). Recommend coordinator
   first; the driver is a child process, so moving it later is a transport change, not a rewrite.
2. **How `sin-harness` is consumed** — `file:` dependency in a private match-server, or a
   published private package. Recommend `file:`/git pin for phase 0–2, publish once stable.
3. **Budgets** — mirror today's (200 turns, 120 s per command, 45 min match) as ceilings, then
   let the harness use them better. Token budget is new; needs a number.
4. **Recovery** — DFC re-registers active matches and replays a recovery briefing after a
   coordinator restart. `dsh --session-id` can resume the actual session instead. Worth doing,
   but only after phase 2.
5. **Arena image** — no change needed for this plan (ssh2 channel only, no helper, no Node in
   the arena). That is a meaningful advantage over the earlier "SSH provider + helper" sketch.

## 6. What I need from you

- Go/no-go on the `AgentDriver` adapter as the integration surface (the alternative is a
  standalone fighter service that speaks to the coordinator's API, which is more work and
  duplicates the orchestrator).
- Permission to branch the dfc repo and land phase 0 behind a flag (no behavior change).
- One dev container or a compose recipe to point slot 1 at, for phase 1.
- Whether phase 1-2 work happens in `sin-harness` (harness side) only, or also in `dfc`.

## 7. Housekeeping

- PAT now has push on `sin-harness` and read on `dfc`; stored outside git at
  `/dsh-home/secrets/github.pat` (600) with a credential helper.
- `sin-harness` is still **public**. An offensive-security preset should not be. Make it private
  or keep the arena plugin out of it.
- The local `/opt/dsh` checkout is behind `origin/sin/docker` (remote has
  `327775c`); local branch points at master with the docker files untracked. Worth reconciling
  before the next push.
- DFC's own TASKS.md flags an open item: rotate the PAT embedded in the production server's git
  remote URL (plaintext, since 2026-08-15). Still open.
