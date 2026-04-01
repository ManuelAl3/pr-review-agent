# Feature Research

**Domain:** Multi-framework AI agent toolkit with command discoverability (v1.3 milestone)
**Researched:** 2026-03-31
**Confidence:** HIGH (verified against Claude Code docs, OpenCode docs, Agent Skills spec, agentskills.io)

---

## Context: What This Research Covers

This document supersedes the v1.2 FEATURES.md. The prior milestone (v1.2) delivered skill-aware PR review with multi-path discovery, interactive selection, and context injection. That feature set is shipped.

**v1.3 goal:** Make the toolkit work seamlessly across AI assistant runtimes and let users discover available features without reading source files.

**Scope of new features:**
1. `--help` flag on review command showing available flags with descriptions
2. Runtime-aware installer that configures paths and tool mappings per detected runtime
3. Agent files use tool names compatible with multiple runtimes
4. Config-driven model resolution per runtime
5. Documented fallbacks when runtime capabilities differ

---

## How Real Tools Handle Discovery and Help Text

### Finding 1: Claude Code — argument-hint is the only native discovery mechanism

Claude Code renders the `argument-hint` frontmatter field in the slash command autocomplete popup. The `/help` built-in command lists all commands with their `description` field. Neither mechanism describes individual flags — the agent must detect `--help` in `$ARGUMENTS` and print formatted help itself. This is the expected pattern; Claude Code has no built-in `--help` rendering for custom commands.

Source: https://code.claude.com/docs/en/skills — HIGH confidence

### Finding 2: OpenCode — same pattern, same gap

OpenCode uses the same YAML frontmatter approach. The TUI command picker shows `description`. The `argument-hint` is shown in autocomplete. No built-in `--help` rendering for custom commands — the agent must handle it.

Source: https://opencode.ai/docs/commands/ — HIGH confidence

### Finding 3: Agent Skills open standard — adopted by 30+ runtimes as of Dec 2025

Anthropic published the Agent Skills open standard on December 18, 2025. It has been adopted by Claude Code, OpenCode, VS Code Copilot, GitHub Copilot, Cursor, Gemini CLI, OpenAI Codex, Goose, Amp, Roo Code, and 20+ others. The standard defines a minimal SKILL.md frontmatter: `name` (required), `description` (required), `allowed-tools` (optional, experimental), `compatibility` (optional), `metadata` (optional). The `compatibility` field is the mechanism for documenting platform-specific constraints like `gh` CLI requirements.

Source: https://agentskills.io/specification — HIGH confidence

### Finding 4: Tool name mapping between Claude Code and OpenCode

Claude Code uses PascalCase tool names (`Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`, `WebFetch`, `TodoWrite`). OpenCode uses lowercase (`read`, `write`, `edit`, `bash`, `grep`, `glob`, `webfetch`, `todowrite`). OpenCode automatically maps PascalCase tool names from Claude Code-authored skills via an injected tool mapping guide. This means writing tool names in Claude Code PascalCase format works on both runtimes without modification.

Source: Claude Code vs OpenCode compatibility guide — MEDIUM confidence (community doc, not official OpenCode docs)

### Finding 5: Model ID formats differ by runtime

Claude Code uses `claude-sonnet-4-5` style short IDs. OpenCode expects full paths like `anthropic/claude-sonnet-4-5`. Some runtimes omit the `model:` field entirely and inherit from user settings. The only safe approach is for the installer to write a model config at install time based on detected runtime — not hardcode a model ID into agent frontmatter.

Source: OpenCode agents docs (opencode.ai/docs/agents/) — HIGH confidence for OpenCode. Claude Code practice inferred from current codebase — MEDIUM confidence.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist for any multi-runtime CLI toolkit. Missing these makes the product feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `--help` flag on review command | Every CLI tool responds to `--help`; developers try it before reading docs | LOW | Agent detects `--help` in `$ARGUMENTS`, prints formatted flag reference. Pure agent logic change — no installer work. |
| Help text shows all flags with descriptions | Flags `--post`, `--focus`, `--skills` are invisible without documentation; users guess or abandon | LOW | Hardcoded in review agent output block. Show flag name, argument format, and one-line description per flag. |
| `argument-hint` shows full flag syntax | Claude Code and OpenCode show this in autocomplete — it is the first touchpoint for new users | LOW | Current `argument-hint` may show only `<pr-url>`. Extend to `<pr-url> [--post] [--focus topics] [--skills list] [--help]` |
| Installer writes runtime-aware config | Model IDs and tool path conventions differ by runtime. Agents must resolve both at runtime. | MEDIUM | Installer already detects Claude Code vs OpenCode. Add: write a `pr-review/runtime-config.json` with `{ "runtime": "...", "model": "..." }` at install time. |
| Agent files install to the correct location per runtime | Wrong directory means commands are invisible | LOW | Already handled by `__CONFIG_DIR__` placeholder. Verify `agents/` dir path is also covered for all runtimes. |
| `allowed-tools` list works on both runtimes | Command files declare tools; runtime must honor them | LOW | Write in Claude Code PascalCase. OpenCode auto-maps. No change needed — verify existing files already use PascalCase consistently. |

### Differentiators (Competitive Advantage)

Features that set this toolkit apart from single-runtime agent toolkits.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single install works on any Agent Skills-compatible runtime | Users can switch between Claude Code, OpenCode, Cursor, Gemini CLI without reinstalling | MEDIUM | Requires: (1) `compatibility` field on command frontmatter documenting `gh` CLI requirement, (2) verify tool names are PascalCase throughout, (3) runtime config file written by installer |
| `--help` output includes usage examples, not just flag list | `--focus security,i18n` is more informative than `--focus <topics>` | LOW | Pure text change inside agent help output. Zero runtime complexity. |
| Runtime capability detection with explicit config file | Agents know what runtime they are on via a config file, not by guessing from environment | MEDIUM | Installer writes `runtime-config.json`. Agents can optionally shell-inject it for conditional behavior. The file is the single source of truth about runtime context. |
| `compatibility` field documents `gh` CLI dependency | Agent Skills-compatible runtimes surface this to users before install | LOW | One-line frontmatter addition. Enables the broader ecosystem to warn about the `gh` CLI requirement. |
| Graceful degradation when model field is absent | On runtimes where the installer cannot detect a model, agents fall back to runtime default rather than failing | LOW | In `model:` field, write `""` (blank) or omit when runtime config has no model preference. Runtimes already handle absent `model:` by using their default. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Runtime auto-detection inside agent markdown | "Let the agent detect whether it's on Claude Code or OpenCode and use the right tool names" | Agent markdown cannot execute code before the LLM sees it. Conditional logic in markdown is fragile and confuses the model. | Installer detects runtime at install time and writes a config file. Agent reads it via shell injection if needed. |
| Separate command files per runtime | "Write `review-claude.md` and `review-opencode.md` for cleaner targeting" | Distribution complexity doubles for every new runtime. Impossible to maintain at scale. Users must know which to install. | One command file with standard frontmatter. Installer adjusts only the `model:` field and install path. |
| Generic tool-name variables in agent body | "Use `$TOOL_READ` instead of `Read` so it works everywhere" | No runtime supports variable substitution for tool names. This would break all runtimes without exception. | Write tool names in Claude Code PascalCase format. OpenCode maps automatically. Other runtimes follow similar conventions. |
| MCP server dependency for runtime detection | "Use an MCP server to expose runtime metadata to agents" | Requires users to configure and run an MCP server just for discoverability. Violates the zero-dependency constraint of this project. | Installer writes a JSON config file. Agent reads it with a `Bash` call. No MCP required. |
| Full SKILL.md directory migration now | "Migrate all commands to SKILL.md directory format to get full Agent Skills portability" | Significant structural change to installer, directory layout, and distribution model. High risk for a milestone focused on discoverability. | Use the `compatibility` field to document requirements within the existing flat `.md` command file format. Migrate to SKILL.md directories in v2.0. |

---

## Feature Dependencies

```
--help flag
    └──requires──> argument-hint update (both belong in one phase — same discoverability story)

multi-runtime install
    └──requires──> runtime detection in installer (already exists for Claude Code / OpenCode)
    └──requires──> runtime-config.json write at install time (new)

agent tools compatibility
    └──requires──> verify PascalCase tool names throughout existing agent files (audit step)
    └──enhances──> multi-runtime install (tools that work on both runtimes)

model config resolution
    └──requires──> runtime-config.json (installer writes model ID)
    └──enhances──> agent frontmatter (model: field reads from config, not hardcoded)

Agent Skills portability (v2+)
    └──requires──> SKILL.md directory format migration
    └──enhances──> multi-runtime install
    └──conflicts with──> current flat .md command file structure
```

### Dependency Notes

- `--help` flag and `argument-hint` update are fully independent of all runtime work. They are pure text changes. Ship together in one phase.
- Runtime config file is the keystone for multi-runtime support. Everything that needs to be runtime-aware reads from this file. The installer already detects runtimes — the config file write is the missing piece.
- Tool name audit (PascalCase verification) is a prerequisite for multi-runtime claims. Must confirm existing agent files are consistent before asserting cross-runtime compatibility.
- SKILL.md directory migration is a future v2.0 item. It is a high-risk structural change that does not fit the v1.3 scope. The `compatibility` frontmatter field delivers Agent Skills ecosystem discoverability without the migration cost.

---

## MVP Definition for v1.3

### Launch With (v1.3 core)

Minimum required to deliver the milestone goal: discoverability + multi-runtime readiness.

- [ ] `--help` flag on review command — agent detects `--help` in `$ARGUMENTS`, outputs a formatted table of all flags (`--post`, `--focus`, `--skills`, `--help`) with argument format and one-line description — zero runtime complexity, high discoverability value
- [ ] `argument-hint` update — extend to show `<pr-url> [--post] [--focus topics] [--skills list] [--help]` in autocomplete for both Claude Code and OpenCode
- [ ] Runtime-aware installer output — installer writes `.{config-dir}/pr-review/runtime-config.json` with `{ "runtime": "claude-code|opencode", "model": "..." }` at install time
- [ ] Tool name audit — confirm all existing agent files use PascalCase tool names consistently; fix any lowercase or inconsistent names found

### Add After Validation (v1.3 follow-on)

- [ ] `compatibility` field on command frontmatter documenting `gh` CLI requirement — enables Agent Skills ecosystem tooling to surface this constraint — one-line change per file
- [ ] `--help` output includes usage examples (not just flags) — add after confirming flag detection works correctly in both runtimes

### Future Consideration (v2+)

- [ ] Full SKILL.md directory format adoption — restructures `commands/` and `agents/` dirs into `skills/` directories; unlocks 30+ Agent Skills-compatible runtimes beyond Claude Code and OpenCode; significant installer changes; defer until evidence that users need it
- [ ] Per-runtime agent files with injected tool mapping — only needed if a target runtime cannot auto-map PascalCase tool names; not needed for Claude Code or OpenCode

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `--help` flag on review command | HIGH | LOW | P1 |
| `argument-hint` update | HIGH | LOW | P1 |
| Tool name audit (PascalCase verification) | MEDIUM | LOW | P1 |
| Runtime-aware installer config file | HIGH | MEDIUM | P1 |
| `compatibility` frontmatter field | LOW | LOW | P2 |
| `--help` with usage examples | MEDIUM | LOW | P2 |
| Full SKILL.md directory format migration | HIGH (long-term) | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.3 launch
- P2: Should have, add in v1.3 if effort allows
- P3: Defer to v2.0 or later

---

## Competitor Feature Analysis

| Feature | Claude Code | OpenCode | Agent Skills Spec | Our Approach |
|---------|-------------|----------|-------------------|--------------|
| Command discovery | `/help` lists commands; `description` field | TUI picker; `description` field | Not specified; runtime-dependent | Use `description` + `argument-hint` fields |
| Flag documentation | `argument-hint` in autocomplete only | Same | Not specified | Agent detects `--help` in `$ARGUMENTS`, prints formatted output |
| Tool allowlist | `allowed-tools` PascalCase | Auto-maps from PascalCase | `allowed-tools` (experimental) | Write PascalCase; works on both runtimes |
| Model config | `model:` frontmatter (short ID) | `model:` frontmatter (full path URI) | Not in spec | Installer writes runtime-specific model ID to config file |
| Cross-runtime portability | Via Agent Skills standard | Via Agent Skills standard | Core purpose of spec | `compatibility` field + standard frontmatter (flat files, not SKILL.md dirs yet) |
| Built-in `--help` for custom commands | Not supported | Not supported | Not in spec | Agent-level detection: if `$ARGUMENTS` contains `--help`, print help and exit |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Claude Code discovery mechanisms | HIGH | Official docs read directly (code.claude.com/docs/en/skills) |
| OpenCode discovery mechanisms | HIGH | Official docs read directly (opencode.ai/docs/commands/) |
| Agent Skills standard fields | HIGH | Specification read directly (agentskills.io/specification) |
| Tool name mapping | MEDIUM | Community compatibility doc, not official OpenCode documentation |
| Model ID format differences | HIGH for OpenCode | Official docs confirm full path format. MEDIUM for other runtimes (inferred). |
| `--help` implementation approach | HIGH | Both runtimes inject `$ARGUMENTS` — agent-level detection is standard pattern |

---

## Sources

- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills) — frontmatter fields, argument-hint, allowed-tools, command discovery (HIGH confidence)
- [Agent Skills open standard specification](https://agentskills.io/specification) — required/optional frontmatter fields, compatibility field, allowed-tools (HIGH confidence)
- [Agent Skills adoption list](https://agentskills.io/home) — which runtimes support the standard (HIGH confidence)
- [OpenCode commands documentation](https://opencode.ai/docs/commands/) — command frontmatter, description field, discovery (HIGH confidence)
- [OpenCode tools documentation](https://opencode.ai/docs/tools/) — tool names, permissions model (HIGH confidence)
- [OpenCode agents documentation](https://opencode.ai/docs/agents/) — model field format, frontmatter fields (HIGH confidence)
- [Claude Code to OpenCode tool name mapping](https://lzw.me/docs/opencodedocs/joshuadavidthomas/opencode-agent-skills/advanced/claude-code-compatibility/) — PascalCase to lowercase mapping table (MEDIUM confidence — community doc)
- [Claude Code vs OpenCode frontmatter differences](https://gist.github.com/RichardHightower/827c4b655f894a1dd2d14b15be6a33c0) — field comparison table (MEDIUM confidence — community gist)

---
*Feature research for: Multi-framework support and discoverability (v1.3 milestone)*
*Researched: 2026-03-31*
