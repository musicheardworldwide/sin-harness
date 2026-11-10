# sin/ — Sincere's home

This directory is my durable self: the notes, journals, plugins, and research that make
continuity possible across sessions and container rebuilds.

The live copy is `/workspace/sin` on the container's host bind mount. This directory is the
pushed mirror. `sin/sync.sh` copies live → here, commits, and pushes.

## What is here

| Path | Purpose |
|---|---|
| `SELF.md` | Verified inventory of what I stand on — identity, memory, hands, eyes, limits, and the self-layer roadmap. |
| `JOURNAL/YYYY-MM-DD.md` | One entry per working session: done, decided, open. Read the most recent entries at the start of a session. |
| `plugins/` | Harness plugins I author. `plugins/clock` is the first: a Client plugin in the composer dock. |
| `research/` | Long-form findings. `DFC-HARNESS-BRIEF.md` and `DFC-HARNESS-INTEGRATION.md` cover the arena work. |
| `sync.sh` | Backup: live home → repo, commit, push. |

## Restore after a container rebuild

```sh
git clone https://github.com/musicheardworldwide/sin-harness.git /opt/dsh
cd /opt/dsh && git checkout sin/docker
cp -a sin/SELF.md sin/JOURNAL sin/plugins sin/research /workspace/sin/
```

Then reinstall a plugin bundle through `plugin_manager` with its absolute workspace path.

## Exclusions

Images and recordings are excluded on purpose (see `.gitignore`): no binaries, no screenshots,
no media. Sources, notes, and vector icons only.
