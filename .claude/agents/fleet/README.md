# TORQ-CONSOLE Agent Fleet

Version-controlled Claude Code subagent definitions, scoped to TORQ-CONSOLE work.

## What this is

27 curated subagent specs imported from the global `~/.claude/agents/` fleet on 2026-05-30.
Claude Code scans `.claude/agents/**/*.md` recursively, so every file here is auto-discovered
and selectable by `description` when Claude Code runs inside this repo. Committing them to the
repo means the fleet is reproducible on any machine that checks out TORQ-CONSOLE, not just the
machine where the global `~/.claude/agents/` happens to exist.

## Why a `fleet/` subdirectory (not the parent `agents/`)

The parent `.claude/agents/` already holds three files — `architect.md`, `builder.md`,
`verifier.md` — which are the **V5 harness role prompts** (large, repo-specific system prompts
loaded via `--append-system-prompt` by the V5 launcher). Those are a different kind of artifact
from a general-purpose subagent spec. Keeping the imported fleet in `fleet/` separates the two
concerns while still letting both be discovered (recursive scan). The `name:` fields do not
collide.

## Scope: what was included / excluded

Included (TORQ-relevant): core dev (expert-software-engineer, backend-engineer,
frontend-architect, fullstack-orchestrator, python-expert, code-reviewer); trading/finance
(trading-bot-specialist, quant-analyst, risk-manager, fintech-engineer, market-researcher);
data/research (data-scientist, data-researcher, database-specialist, research-expert,
search-specialist); security (cybersecurity-expert, cybersecurity-strategist,
security-compliance-agent, credential-security-agent); deploy/infra (deployment-expert,
system-administrator-expert, performance-engineer, performance-monitor); meta (prd-generator,
project-analyzer-agent, meta-agent).

Excluded (not applicable to TORQ runtime work): the n8n workflow cluster, TTS agents,
viral-content-strategist, scheduling-assistant, file-organizer-agent, browser-automation,
vs-code-writer, hello-world, ai-control-interface, content/api integration agents, and the
project-specific PDF-AI / TBS website agents.

## Relationship to the Python registry

These `.md` files are **not** currently loaded by `torq_console/agents/registry.py` — that
registry is hardcoded (7 default agents) + Supabase-backed and has no markdown loader. Making
the runtime aware of this fleet is a separate, gated change tracked by the PRD
`prd_t-agentfleet.md` (T-L40). Until that lands, these files are consumed only by Claude Code's
own subagent discovery, not by the TORQ application runtime.

## Maintenance

- Filenames are lowercase kebab-case `.md`, matching the `name:` frontmatter field.
- These are imported copies. The canonical source is `~/.claude/agents/`; re-sync if the global
  fleet's descriptions/tools change.
- No secrets belong in any agent file (scanned clean on import).
