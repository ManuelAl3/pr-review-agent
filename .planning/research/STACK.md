# Stack Research

**Domain:** Multi-framework skill detection for AI agent toolkit (npm-distributed)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Context

This is a focused stack update for an existing project. The core stack (Node.js built-ins, zero dependencies, vanilla HTML/JS, `gh` CLI) is already decided and validated. This document covers only the **new stack surface** introduced by v1.2: skill detection and interactive selection across multiple AI assistant frameworks.

No new runtime dependencies are being added. All implementation uses existing Node.js built-ins.

---

## Skill File Locations by Framework

This is the authoritative discovery map. The pr-reviewer agent must check these paths, in this order.

### Claude Code

| Scope | Path | Notes |
|-------|------|-------|
| Project-local | `.claude/skills/<name>/SKILL.md` | Highest priority for project |
| Global (user) | `~/.claude/skills/<name>/SKILL.md` | Available across all projects |
| Nested (monorepo) | `packages/*/` → `.claude/skills/*/SKILL.md` | Auto-discovered from subdirectories |

Source: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)

### OpenCode

| Scope | Path | Notes |
|-------|------|-------|
| Project-local | `.opencode/skills/<name>/SKILL.md` | Highest priority |
| Global (user) | `~/.config/opencode/skills/<name>/SKILL.md` | XDG config location |

Source: [OpenCode Skills Docs](https://opencode.ai/docs/skills/)

### Agent Skills Open Standard (`.agents/`)

| Scope | Path | Notes |
|-------|------|-------|
| Project-local | `.agents/skills/<name>/SKILL.md` | Framework-neutral |
| Global (user) | `~/.agents/skills/<name>/SKILL.md` | Available to any compliant tool |

Source: [Agent Skills Specification](https://agentskills.io/specification)

### Cross-compatible: Claude-format paths in OpenCode

OpenCode reads `.claude/skills/` in addition to its own `.opencode/skills/`. This means a project committing skills to `.claude/skills/` gets them picked up by both frameworks without duplication.

---

## SKILL.md Format (Agent Skills Open Standard)

This is the canonical format used by all three frameworks. Claude Code extends it with additional fields; those extensions are backwards-compatible.

### Frontmatter Fields

| Field | Required | Constraints | Purpose |
|-------|----------|-------------|---------|
| `name` | Yes (base spec) | 1-64 chars, `[a-z0-9]+(-[a-z0-9]+)*`, must match directory name | Slash command name |
| `description` | Yes (base spec) | 1-1024 chars | Agents scan this to decide when to use the skill |
| `license` | No | Short string or filename reference | License information |
| `compatibility` | No | 1-500 chars | Environment requirements |
| `metadata` | No | String-to-string map | Arbitrary extra data |
| `allowed-tools` | No (experimental) | Space-delimited list | Pre-approved tools |

### Claude Code Extensions (backwards-compatible)

| Field | Purpose | When to use |
|-------|---------|-------------|
| `disable-model-invocation` | `true` prevents auto-loading | Manual-only workflows |
| `user-invocable` | `false` hides from slash menu | Background knowledge skills |
| `argument-hint` | Autocomplete hint | Skills that accept arguments |
| `model` | Override model per skill | Specialized tasks |
| `effort` | Override effort level | `low`, `medium`, `high`, `max` |
| `context` | `fork` to run in subagent | Isolated execution |
| `agent` | Subagent type for `context: fork` | `Explore`, `Plan`, custom |
| `paths` | Glob patterns limiting activation | File-specific skills |
| `hooks` | Lifecycle hooks for the skill | Automated workflows |
| `shell` | `bash` or `powershell` | Windows compatibility |

### Minimal valid SKILL.md

```yaml
---
name: skill-name
description: What this skill does and when to use it.
---

## Instructions

Step-by-step instructions for the agent.
```

### Naming Convention

Skill directory name MUST match `name` in frontmatter:

```
.claude/skills/
  conventional-commit/    <- directory name = "conventional-commit"
    SKILL.md              <- name: conventional-commit
```

Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase, hyphens as word separators, no leading/trailing/consecutive hyphens)

---

## Recommended Detection Strategy for pr-reviewer.md

The agent reads skill files using the `Read` and `Glob` tools (already in its `allowed-tools`). No new tooling needed.

### Detection Order (priority: project-local first)

```
1. ./.claude/skills/*/SKILL.md          (Claude Code project-local)
2. ./.opencode/skills/*/SKILL.md        (OpenCode project-local)
3. ./.agents/skills/*/SKILL.md          (Agent Skills open standard, project-local)
4. ~/.claude/skills/*/SKILL.md          (Claude Code global — check $HOME)
5. ~/.config/opencode/skills/*/SKILL.md (OpenCode global)
6. ~/.agents/skills/*/SKILL.md          (Agent Skills global)
```

In practice, for PR review the project-local skills are most relevant (they encode project-specific conventions). Global skills encode user preferences. The agent should discover all and let the developer select.

### What to Extract from Each SKILL.md

When scanning, read only the frontmatter (lines between `---` markers) for listing/selection:

- `name` — for display and selection
- `description` — to show developer what each skill does before selection

The full SKILL.md body is loaded only for selected skills (progressive disclosure, matching the spec's intent).

---

## Interactive Selection Implementation

No new tech needed. The agent uses `AskUserQuestion` (already in `review.md`'s `allowed-tools`).

**Pattern:**
1. Glob all SKILL.md paths across discovery dirs
2. Parse frontmatter from each file (Node.js built-ins: `fs.readFileSync` -> split on `---` -> YAML-ish line parsing)
3. Present list to developer with `AskUserQuestion`
4. Load full body of selected skills as additional review context

### Frontmatter Parsing (no yaml library needed)

Skills frontmatter is simple enough for manual parsing. The agent reads the file and extracts `name:` and `description:` lines with basic string operations — no external YAML parser required, consistent with the zero-dependency constraint.

---

## Placeholder System Integration

The existing `__CONFIG_DIR__` placeholder handles `.claude` vs `.config/opencode`. For skill detection, the agent also needs to handle `.opencode` (not a placeholder path — it's independent of the install config dir).

**Discovery paths that use `__CONFIG_DIR__`:**
- `./__CONFIG_DIR__/skills/*/SKILL.md` (the installed runtime's config dir)

**Discovery paths that are hardcoded (framework-specific):**
- `./.opencode/skills/*/SKILL.md`
- `./.agents/skills/*/SKILL.md`
- `$HOME/.claude/skills/*/SKILL.md`
- `$HOME/.config/opencode/skills/<name>/SKILL.md`
- `$HOME/.agents/skills/*/SKILL.md`

The agent markdown should reference these as literal paths (not placeholders) since skill discovery spans all frameworks regardless of which one installed pr-review-agent.

---

## What NOT to Add

| Avoid | Why | Instead |
|-------|-----|---------|
| `js-yaml` or any YAML parser | Breaks zero-dependency constraint | Manual frontmatter extraction (split on `---`, parse `key: value` lines) |
| `glob` npm package | Built-in `fs.readdirSync` with recursive walk suffices for known path patterns | Native filesystem traversal in agent Bash/Glob tool calls |
| Scanning entire `$HOME` recursively | Slow, unpredictable, wrong | Only check the 6 known paths listed above |
| Loading all skill bodies at startup | Context bloat — progressive disclosure is the standard | Load only frontmatter for listing, full body for selected skills |
| Asking about skills when none are found | Adds friction for projects without skills | Silently proceed if no skills are found |

---

## Version Notes

| Component | Version | Status |
|-----------|---------|--------|
| Agent Skills Specification | Open standard (published Dec 2025) | Stable — used by Claude Code, OpenCode, GitHub Copilot, Codex |
| Claude Code skills format | Current (verified 2026-03-31) | Extensions are backwards-compatible with base spec |
| OpenCode skills support | Current (verified 2026-03-31) | Reads `.claude/skills/` AND `.opencode/skills/` |
| Node.js version requirement | `>=18.0.0` | No change — built-ins used for all parsing |

---

## Sources

- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills) — Complete frontmatter reference, directory paths, naming rules — HIGH confidence (official docs, verified 2026-03-31)
- [Agent Skills Specification at agentskills.io](https://agentskills.io/specification) — Base spec for `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` fields — HIGH confidence (official spec, verified 2026-03-31)
- [OpenCode Skills Docs](https://opencode.ai/docs/skills/) — OpenCode discovery paths including `.claude/skills/` cross-compatibility — HIGH confidence (official docs, verified 2026-03-31)
- Existing project code at `.claude/skills/conventional-commit/SKILL.md` — Real-world skill in this repo, confirms format — HIGH confidence (direct inspection)
- `bin/install.js` RUNTIMES config — Existing placeholder system — HIGH confidence (direct inspection)

---

*Stack research for: v1.2 Skill-Aware PR Review (skill detection and selection)*
*Researched: 2026-03-31*
