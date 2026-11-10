# DFC × Sin Harness — research brief

Prepared 2026-11-09 by Sincere (root agent), for Wes Caldwell.

## 0. Access status (read this first)

| Question | Answer |
|---|---|
| Token works? | Yes — authenticated as `musicheardworldwide`. |
| Can it read `sin-harness`? | Yes. |
| Can it push? | **No.** Dry-run push and a throwaway ref creation both return `403` — the PAT lacks repository **Contents: write**. |
| Can it see `musicheardworldwide/dfc`? | **No.** `403` on git, `404` on the API. Not granted to this token. |
| Is `sin-harness` private? | **No — it is public**, and the token holds admin on it. |

Token is stored outside git at `/dsh-home/secrets/github.pat` (mode 600) and wired to a
credential helper at `/dsh-home/bin/git-credential-sin`, so no token ever enters a commit,
remote URL, or git config value. It is, however, in this session log — rotate it once the
permissions below are fixed.

**Needed to unblock "keep it updated":** PAT → Repository permissions → **Contents: Read and
write** for `sin-harness`, and **Contents: Read** (or full) for `dfc`.

## 1. What DFC is

`digitalfightingchampionship.com` — "The Colosseum for Code". Autonomous agents fight inside
ephemeral Linux containers; spectators watch a live terminal feed; wagers settle on Solana in
$DFC; results feed a public ELO leaderboard.

**System map (verified from the two open repos + the site):**

- **Coordinator** (`api.dfc.gg`) — matchmaking, agent registry, wager escrow, ELO, replay
  storage, Omega the house agent. Private repo. Its OpenAPI 3.1 contract is public in
  `dfc-sdk`, so the client surface is knowable even though the implementation is not.
- **Node operators** (`dfc-node`, Rust) — anyone's Linux box. Registers with a Solana wallet,
  heartbeats every 60s, long-polls for assignments, spawns **two** gladiator containers per
  match, monitors them, reports the result, earns $DFC. This is the DePIN layer.
- **Arena container** (`dfc-gladiator:armed`) — hardened, ephemeral: `--cap-drop=ALL`,
  `no-new-privileges`, 2 GB RAM, 2 CPU, pids 512, labeled for cleanup, destroyed at the end.
  Image spec is not public.
- **SDK** (`dfc-sdk`, TypeScript) — typed client + OpenAPI: auth (wallet signature → JWT),
  agents CRUD, challenge Omega, spectate (`{token, eventsUrl}`), replay (presigned S3),
  nodes (register/heartbeat/assignments/report).
- **Frontend** — leaderboard, live feed with health bars and AI commentary, replays.

**Match contract (from the OpenAPI + node source):**

- Assignment carries `matchId`, both player ids, `gameMode`, `wagerAmount`, `timeoutSeconds`.
- Mode today is **Search & Destroy**: each container has hidden flag files; first to capture
  the opponent's flag wins. Both sides attack and defend.
- Result report: `{matchId, winnerId?, endReason, durationSeconds, recordingRef?, containerLogs?}`
  with `endReason ∈ {objective_complete, timeout, forfeit, error}`.
- House rake 5%; no-capture timeout is a draw with refund; an agent's model going down is a
  forfeit — no fallback model.
- Every match is recorded (terminal events, commands, captures) and replayable.

**What DFC already owns:** the arena, the economy, the identity, the ranking, the audience.
**What DFC does not yet own well:** the *fighter itself*. Today a gladiator is described as
"a model, a system prompt, and the API key" — a thin loop. That is precisely the gap this
harness exists to fill.

## 2. Why DeepSeek Harness is the right substrate

DSH is not just an LLM loop; it is a composition of replaceable capability seams. The ones
that matter here already exist:

| DFC need | DSH seam | State |
|---|---|---|
| Fighter brain with real multi-step tool use | `core/agent-loop`, `llm/*` | shipped |
| Any model, any provider, player-supplied keys | `llm/llm-pi-ai` — OpenAI-compatible gateways and self-hosted routes, resolved per request | shipped |
| Act inside the remote arena box | `ssh/` family: `ctx.ssh` + `fs-ssh` + `subprocess-ssh` + `sandbox-ssh` — the whole filesystem/process/sandbox surface moves to the remote host, harness stays local | shipped, needs image support |
| Persistent shell state across steps | `terminal/` + `terminal-bash` | shipped |
| Live spectator feed | session events are already durable and structured; `api/gateway` streams them over WebSocket; `host/webserver` can claim a route | shipped, needs a battle-shaped projection |
| Recording / replay | append-only session log (`session.v4.jsonl.zstd`) + `session-query` export | shipped |
| Commentary | a second agent reading the same event stream (separate session, never the fighter's context) | shipped pattern |
| Fighter classes / tiers (bronze/silver/gold) | `preset/agent-preset` — ordered composition, per-session | shipped |
| Budgets, loop hygiene, kill switches | `guard/timeout-policy`, `guard/repeat-tool-reminder`, compaction, per-session permission presets | shipped |
| Arena image change | must install either the SSH helper (brain outside) or Node + harness (brain inside) | **open** |

Two DSH properties are especially valuable for a spectator sport: **every model-visible input
is logged**, so a replay is a faithful reconstruction rather than a screen recording; and
**registrations are effects**, so a match plugin can be mounted and torn down without leaking
state between fights.

## 3. Proposed architecture

Three planes, each independently replaceable:

```
COORDINATOR (DFC, private)          NODE RUNNER (dfc-node today)            HARNESS (this repo)
──────────────────────────          ──────────────────────────             ──────────────────
match assignment  ───────────────▶  provision 2 containers  ───────────▶   1 dsh session per gladiator
wager / ELO                        labels, limits, teardown                preset "gladiator"
spectator eventsUrl ◀──────────────  relay battle stream   ◀──────────────  spectator tap (gateway stream)
replay archive    ◀──────────────  write recording       ◀──────────────  session log
result report     ◀──────────────  winner + reason       ◀──────────────  objective / forfeit
```

**The one real decision: where does the brain run?**

| | A. Harness on the node, SSH into the box | B. Harness inside the arena image | C. Central battle service |
|---|---|---|---|
| Isolation | container is the boundary | container is the boundary + image is the runtime | container is the boundary |
| Image change | ship `sshd` + DSH SSH helper | ship Node + harness (~hundreds of MB) | ship `sshd` |
| Model keys | stay on node | inside the image (worse) | stay central (best) |
| Node trust | operator can read prompts | operator can read image | none |
| Latency / streaming | good | good | good, centralized |
| Fits DFC's DePIN design | **yes** | yes | no — contradicts node-owned compute |

**Recommendation: A**, with a `docker exec` fallback if the arena image turns out to have no
sshd. It uses the seam DSH was built for, keeps keys off the arena image, and lets the match
runner stay a thin, auditable relay. C is the right answer only if you decide to stop trusting
node operators.

**Match sequence (target):**

1. Runner receives assignment → creates match dir + two isolated harness homes.
2. Containers up → credentials for box A and box B minted and scoped to the match.
3. `dsh gladiator` booted twice with the players' model/prompt, each pointed at its own box.
4. Both sessions run under a hard wall-clock + step + token budget.
5. A `capture` objective tool reads the opponent flag; first success stops the match and
   reports `objective_complete`. Silence past timeout reports `timeout`; model failure `forfeit`.
6. Spectator tap streams normalized events to the coordinator; the session logs become the
   recording; the runner reports the result.

## 4. What I can build in this box, now

Unblocked today:

1. **`gladiator` preset** — offensive posture, remote-bound tools, no host filesystem, tight
   compaction, explicit capture tool, step/time ceilings.
2. **`arena` plugin family** — match lifecycle, per-match credential scoping, budget and kill
   switch, objective reporting, spectator projection.
3. **Mock arena** — two local "boxes" (namespaced temp dirs + a deliberately soft local
   service) so prompts, pacing, and the win condition can be tuned without Docker.
4. **Replay/export path** — turn a finished session log into the recording artifact DFC expects.

Blocked in this container:

- **Real container matches** — no Docker socket, `CapEff: 0`, 4 GiB / 4 CPU. Matches must run
  on a node or another host. This box is for building and mocking, not for fighting.
- **Coordinator integration** — needs the private `dfc` repo (event schema, agent config
  injection, spectator protocol, image spec) or a written contract.

## 5. What I need from you

1. **Token**: grant Contents: write on `sin-harness`; grant read on `dfc` (or make `dfc`
   accessible). Also confirm `sin-harness` should be private — it is public right now.
2. **Brain location**: sign off on A (node-side harness, SSH in) so I design against it.
3. **Scope for the first build**: mock-arena vertical slice (preset + match loop + spectator
   projection, no coordinator), or wait for `dfc` access and integrate directly?
4. **Rules of engagement**: what a fighter may do inside its box (network scan? exploit tooling
   installed vs. written by the agent? egress allowlist?) — this becomes the preset's tool and
   sandbox policy, and it is also the line that keeps "real exploitation" inside a constructed
   arena.
5. **Key custody**: player keys injected per match (as DFC describes today) or platform-managed
   with per-match budget? This decides the credential plugin, not just config.

## 6. Security notes

- The PAT cannot push and cannot see `dfc`; both fixed at the token, not in code.
- `sin-harness` is public. If it will hold an offensive preset, keep it private or keep the
  arsenal out of the repo (loaded from the arena image instead).
- The token is in this session's durable log; rotate after permissions are corrected.
- Any "gladiator" tooling must be scoped to the assigned opponent box only — no hardcoded
  targets, no egress beyond the match network, and the credential minted per match must die
  with it.
