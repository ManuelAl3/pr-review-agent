# PR Review Agent

## What This Is

An npm-distributed AI agent toolkit that gives developers a complete PR review cycle: analyze GitHub PRs against project-specific patterns, view findings in an interactive UI, fix issues directly in code, and close the loop on GitHub with inline comments and commit-linked replies. Installed via `npx pr-review-agent@latest` into Claude Code or OpenCode config directories.

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

### Active

- [ ] Fix agent resolves findings directly in source code following project patterns
- [ ] Fix agent auto-checkouts PR branch before applying fixes
- [ ] One commit per finding with descriptive message (`fix(review): resolve [title]`)
- [ ] Fix agent pushes commits to PR branch automatically
- [ ] Fix agent replies to each PR inline comment with "Fixed in `<commit-hash>`" linking the commit
- [ ] Review agent posts findings as GitHub inline code review comments (on specific lines)
- [ ] HTML UI shows fix status: green "Resolved" badge + visual dimming for fixed findings
- [ ] HTML UI supports filtering by fix status (pending only / all)
- ✓ Findings JSON has `status` field ("pending" | "resolved") with optional `commitHash` and `commentId` — validated in Phase 01
- [ ] Filter flags for fix command: `--all`, `--only N`, `--severity X`, `--category X`

### Out of Scope

- Auto-merge PRs — the human reviewer decides when to merge
- CI/CD integration — this is a developer tool, not a pipeline step
- Multi-language translation files generation — agent suggests i18n keys, doesn't create .json locale files
- Real-time collaboration — single developer workflow

## Context

- Brownfield project: core review + UI + setup already working and published on npm (v1.2.0)
- Distribution model: npm package that copies files into `.claude/` or `.config/opencode/` dirs
- Zero runtime dependencies: all code uses Node.js built-ins only
- Agent/command architecture: YAML frontmatter defines commands, `agent:` field links to agent .md files
- GitHub CLI (`gh`) is the sole external dependency for PR interaction
- Existing agents: `pr-reviewer.md` (review), `pr-fixer.md` (fix, partially built)
- Existing commands: `review.md`, `setup.md`, `fix.md` (partially built)

## Constraints

- **Zero dependencies**: serve.js, install.js, and index.html must remain dependency-free (Node.js built-ins only)
- **Self-contained HTML**: All CSS, JS, markup in one file. No bundler
- **GitHub CLI**: All GitHub interaction via `gh` CLI — no GitHub API tokens or OAuth
- **No commits without user intent**: Review agent never commits. Fix agent commits only when explicitly invoked
- **Placeholder portability**: All paths use `__CONFIG_DIR__` placeholder, rewritten at install time

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| One commit per finding | Maximum traceability — reviewer sees exactly what changed per issue | — Pending |
| Inline code review comments | Matches how human reviewers work on GitHub — comments on specific lines | — Pending |
| Reply per comment with commit link | GitHub best practice — each thread shows resolution status | — Pending |
| Badge + strikethrough for resolved UI | Natural UX pattern (like GitHub Issues) — dimmed but visible, filterable | — Pending |
| Auto-checkout PR branch | Zero friction for developer — agent handles git state automatically | — Pending |
| Findings gain `status` + `commitHash` + `commentId` fields | Enables UI to track resolution and link to commits | ✓ Phase 01 |

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
*Last updated: 2026-03-30 after Phase 01 (Schema Foundation) completion*
