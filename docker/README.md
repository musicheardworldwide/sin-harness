# DSH in Docker (sin fork)

A disposable sandbox for running and testing DeepSeek Harness, the base for a safety harness.

```sh
cd docker && docker compose up -d --build
docker compose logs dsh | grep 'dsh web: http'   # tokenized URL, open it on creature
```

- Web UI on `127.0.0.1:3080`, creature loopback only. Without the token it answers 401.
- The agent can write only to `docker/workspace/` (bind mount; dsh creates its default workspace inside) and the `dsh-home` volume (settings, API key, sessions, logs).
- Hardening: non-root uid 1000, every capability dropped, no-new-privileges, 512 pids, 4 GB memory, 4 CPUs.
- `/tmp` is a tmpfs with `exec`: the native addon loader copies `.node` files there, and with `noexec` startup fails ("No usable native binding").
- dsh refuses a wildcard bind, so the entrypoint binds the container IP and trusts `127.0.0.1`/`localhost`.
- Network egress is open, because it needs the model API. Restricting it is the first safety-harness task.
- Reset everything: `docker compose down -v`.
