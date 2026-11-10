# DeepSeek Harness (sin fork) built from source, run as a non-root user.
# The container is the safety boundary: dsh only sees /workspace and /dsh-home.
FROM node:26-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@11.28.5
WORKDIR /src
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=8192 CI=1
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:26-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates tini iproute2 xdg-user-dirs \
 && rm -rf /var/lib/apt/lists/* && npm install -g pnpm@11.28.5
# Run as the image's uid-1000 user so the ./workspace bind mount (owned by wes, uid 1000) is writable.
RUN mkdir -p /workspace /dsh-home && chown node:node /workspace /dsh-home
COPY --from=build --chown=node:node /src /opt/dsh
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/dsh-entrypoint
USER node
ENV DSH_HOME=/dsh-home HOME=/home/node XDG_DOCUMENTS_DIR=/workspace
WORKDIR /workspace
EXPOSE 3080
ENTRYPOINT ["/usr/bin/tini","--","/usr/local/bin/dsh-entrypoint"]
CMD ["web"]
