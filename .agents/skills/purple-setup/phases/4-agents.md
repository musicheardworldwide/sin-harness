# Phase 4 — Agents and models

Build:
- Roles as permission profiles on top of phase 1: architect (read + plan, no writes), developer (project writes), tester (run checks, no writes), security (read + audit), researcher (read + web). Enforced by the policy plugin per subagent, not by its prompt.
- Model backends behind one adapter interface (DeepSeek, Claude, local llama.cpp via the ollama-compatible front). The harness owns tools, memory and history; a model is swappable.
- Router table: task class → model, using the existing decisions model to classify. Escalate to the next tier after 2 failed attempts or a low-confidence answer; log each escalation in the journal.

Proof: a tester subagent's write is refused; a task forced to fail twice on the small model is retried on the larger one, and the journal shows both.
