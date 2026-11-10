#!/bin/sh
# dsh refuses wildcard binds, so bind the container's own IP; the host publishes it on loopback only.
set -e
cd /opt/dsh
if [ "$1" = "web" ]; then
  shift
  IP=$(hostname -i | awk '{print $1}')
  exec node --import tsx/esm apps/cli/src/bin.ts --profile web --no-open --host "$IP" --port 3080 \
    --public-url "${DSH_PUBLIC_URL:-http://127.0.0.1:3080/}" --trusted-host 127.0.0.1 --trusted-host localhost "$@"
fi
exec node --import tsx/esm apps/cli/src/bin.ts "$@"
