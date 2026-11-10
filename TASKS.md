# TASKS — sin-harness (Purple Harness)

## Now
- [ ] Serve Purple's web UI on the tailnet so Sin's "local" link opens: `tailscale serve --bg --https=3080 http://127.0.0.1:3080` @wes @yes @kind(go)  <!-- t:ph01 -->
- [ ] Run phase 0 of the purple-setup skill inside Purple and check purple/STATE.md  <!-- t:ph02 -->

## Next
- [ ] Phase 1: governance plugin (policy tiers, deny list, approval queue), policy mounted read-only  <!-- t:ph03 -->

## Blocked

## Backlog
- [ ] Phases 2-7 per .agents/skills/purple-setup  <!-- t:ph04 -->

## Done
- [x] Hardened Docker sandbox, web UI loopback on creature (327775ca02)  <!-- t:ph05 -->
- [x] purple-setup skill written and copied into the container workspace (38eee0fe65)  <!-- t:ph06 -->
