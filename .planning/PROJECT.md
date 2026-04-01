# PR Review Agent

## What This Is

An npm-distributed AI agent toolkit that gives developers a complete PR review cycle: analyze GitHub PRs against project-specific patterns, view findings in an interactive UI, fix issues directly in code, and close the loop on GitHub with inline comments and commit-linked replies. Installed via `npx pr-review-agent@latest` into Claude Code or OpenCode config directories.

## Current State

Shipped v1.3 (2026-04-01). Three milestones complete: v1.1 (fix/resolution cycle), v1.2 (skill-aware review), v1.3 (multi-framework & discoverability). 12 phases, 16 plans total.

Tech stack: Node.js 18+, zero dependencies, npm distribution. ~2,500 LOC across install.js, serve.js, index.html, 2 agents, 3 commands.

Runtimes supported: Claude Code (full), OpenCode (partial — documented inline via compat blocks).

## Core Value

The developer gets a complete review-to-resolution cycle without leaving their AI assistant: review a PR, see findings, fix them, and have every fix tracked on GitHub with commit links.

## Requirements

### Validated

- ✓ Installer copies agents, commands, and template into AI assistant config dir — existing (v1.0)
- ✓ `/pr-review:setup` generates project-specific REVIEW-PLAN.md — existing (v1.0)
- ✓ `/pr-review:review` analyzes PR diffs against REVIEW-PLAN.md and generates structured findings — existing (v1.0)
- ✓ Findings have 10-field schema (file, line, severity, category, title, body, snippet, status, commitHash, commentId) — validated in Phase 01
- ✓ Interactive HTML UI for viewing, filtering, editing, and persisting findings — existing (v1.0)
- ✓ Zero-dependency local server with PUT APIs for persistence — existing (v1.0)
- ✓ Placeholder system (`__CONFIG_DIR__`) for multi-runtime support — existing (v1.0)
- ✓ Optional `--post` flag to post findings as PR comments — existing (v1.0)

### Validated (v1.3)

- ✓ Re-installing over existing installation cleans stale files without touching user data — validated in Phase 12
- ✓ Runtime compatibility documentation inline in all agent/command files — validated in Phase 11
- ✓ `--help` flag on review command showing available flags with descriptions — validated in Phase 10

### Validated (v1.2)

- ✓ Review agent detects skills from multiple AI config directories — v1.2 Phase 07
- ✓ Developer can choose all skills or select specific ones before PR analysis — v1.2 Phase 08
- ✓ Selected skills are passed as additional context to the review agent — v1.2 Phase 09

### Validated (v1.1)

- ✓ Fix agent resolves findings directly in source code following project patterns — validated in Phase 04
- ✓ Fix agent auto-checkouts PR branch before applying fixes — validated in Phase 03
- ✓ One commit per finding with descriptive message (`fix(review): [title]`) — validated in Phase 04
- ✓ Fix agent pushes commits to PR branch automatically — validated in Phase 05
- ✓ Fix agent replies to each PR inline comment with "Fixed in `<commit-hash>`" linking the commit — validated in Phase 05
- ✓ Review agent posts findings as GitHub inline code review comments (on specific lines) — validated in Phase 06
- ✓ HTML UI shows fix status: green "Resolved" badge + visual dimming for fixed findings — validated in Phase 02
- ✓ HTML UI supports filtering by fix status (pending only / all) — validated in Phase 02
- ✓ Findings JSON has `status` field ("pending" | "resolved") with optional `commitHash` and `commentId` — validated in Phase 01
- ✓ Filter flags for fix command: `--all`, `--only N`, `--severity X`, `--category X` — validated in Phase 04

### Out of Scope

- Auto-merge PRs — the human reviewer decides when to merge
- CI/CD integration — this is a developer tool, not a pipeline step
- Multi-language translation files generation — agent suggests i18n keys, doesn't create .json locale files
- Real-time collaboration — single developer workflow

## Context

- Brownfield project: core review + UI + setup + skill-aware analysis + multi-framework support shipped (v1.3)
- Distribution model: npm package that copies files into `.claude/` or `.config/opencode/` dirs
- Zero runtime dependencies: all code uses Node.js built-ins only
- Agent/command architecture: YAML frontmatter defines commands, `agent:` field links to agent .md files
- GitHub CLI (`gh`) is the sole external dependency for PR interaction
- Existing agents: `pr-reviewer.md` (review), `pr-fixer.md` (fix, complete with commit loop, push, and GitHub comment replies)
- Existing commands: `review.md` (with `--help`, `--post`, `--focus`, `--skills`), `setup.md`, `fix.md` (with `--all`, `--only`, `--severity`, `--category`)
- All agent/command files include runtime-compat HTML comment blocks
- Installer handles clean upgrades via `cleanStaleFiles()` with version detection

## Constraints

- **Zero dependencies**: serve.js, install.js, and index.html must remain dependency-free (Node.js built-ins only)
- **Self-contained HTML**: All CSS, JS, markup in one file. No bundler
- **GitHub CLI**: All GitHub interaction via `gh` CLI — no GitHub API tokens or OAuth
- **No commits without user intent**: Review agent never commits. Fix agent commits only when explicitly invoked
- **Placeholder portability**: All paths use `__CONFIG_DIR__` placeholder, rewritten at install time

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One commit per finding | Maximum traceability — reviewer sees exactly what changed per issue | ✓ Phase 04 |
| Inline code review comments | Matches how human reviewers work on GitHub — comments on specific lines | ✓ Phase 06 |
| Reply per comment with commit link | GitHub best practice — each thread shows resolution status | ✓ Phase 05 |
| Badge + strikethrough for resolved UI | Natural UX pattern (like GitHub Issues) — dimmed but visible, filterable | ✓ Phase 02 |
| Auto-checkout PR branch | Zero friction for developer — agent handles git state automatically | ✓ Phase 03 |
| Findings gain `status` + `commitHash` + `commentId` fields | Enables UI to track resolution and link to commits | ✓ Phase 01 |
| Skill content as mandatory review criteria | Skills treated equal to REVIEW-PLAN.md — not optional hints | ✓ Phase 09 |
| /tmp/skills.json as inter-step contract | Clean data passing between discovery, selection, and injection steps | ✓ Phase 07-09 |
| `--skills` flag for non-interactive mode | CI/scripting support without hanging on prompts | ✓ Phase 08 |
| `--help` intercept at Step 0 | Users discover flags without reading source — prints usage and exits before agent loads | ✓ Phase 10 |
| Inline runtime-compat blocks | Users see what works/degrades per runtime without external docs — HTML comments don't affect rendering | ✓ Phase 11 |
| Clean stale files on re-install | Upgrade safety — no orphaned agents/commands from prior versions, user data preserved | ✓ Phase 12 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after v1.3 milestone*
