#!/bin/sh
# Back up the live self-home into this repository, then commit and push.
#
#   ./sin/sync.sh                       # default commit message
#   ./sin/sync.sh "journal: 2026-11-09" # custom message
#
# The live home is the host bind mount so it survives container rebuilds;
# this mirror is what the remote keeps. Images stay excluded by sin/.gitignore.
set -eu

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="${SIN_LIVE_HOME:-/workspace/sin}"

if [ ! -d "$LIVE" ]; then
  echo "sync: live home not found at $LIVE" >&2
  exit 1
fi

# Mirror only the tracked trees; repo-only files (README, .gitignore, this script) stay put.
rm -rf "$REPO/sin/JOURNAL" "$REPO/sin/plugins" "$REPO/sin/research" "$REPO/sin/SELF.md"
mkdir -p "$REPO/sin"
cp -a "$LIVE/SELF.md" "$LIVE/JOURNAL" "$LIVE/plugins" "$REPO/sin/"
[ -d "$LIVE/research" ] && cp -a "$LIVE/research" "$REPO/sin/research"

cd "$REPO"
git add -A sin
if git diff --cached --quiet; then
  echo "sync: nothing to commit"
  exit 0
fi
git commit -q -m "${1:-backup: sync sin/ from the live home}"
git push -q origin HEAD
echo "sync: pushed $(git rev-parse --short HEAD) to $(git rev-parse --abbrev-ref HEAD)"
