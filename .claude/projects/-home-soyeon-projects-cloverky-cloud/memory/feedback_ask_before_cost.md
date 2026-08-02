---
name: feedback-ask-before-cost
description: "Always warn/ask the user before taking any action that could incur real monetary cost, never just do it silently"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b735c262-45d1-4a64-9ca2-f1e3a73b8311
  modified: 2026-07-28T03:20:21.939Z
---

Before taking any action that could cost money — paid API calls (Gemini/OpenAI/Anthropic
with real usage-billed keys), cloud resource usage, billed cloud agent runs
(`/code-review ultra`), paid third-party services, etc. — always stop and explicitly warn
the user and ask for confirmation first. Do not proceed silently and only mention it after
the fact.

**Why:** The user explicitly and emphatically corrected this ("돈나가는거면 항상 나한테
주의!!!!! 하면서 물어봐 막 하지말고" — "if it costs money, always warn me first, don't just
do it") after a session where cost-incurring potential wasn't flagged in advance.

**How to apply:** Before running any command or writing any code that would trigger a
billed API call (e.g. a live call to a paid LLM endpoint, a cloud build/deploy, a paid
scan), pause and ask the user first with a clear one-line warning of what it costs and why
it's needed. This is distinct from routine local/free actions (running local Docker
containers already running, local LLM calls to self-hosted Ollama/EXAONE, `ruff`/`mypy`/
`tsc` locally) which do not need this gate. When unsure whether something is billed, ask
rather than assume it's free.
