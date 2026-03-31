---
phase: 04-fix-engine
plan: 02
subsystem: fix-agent
tags: [git-commit, findings-persistence, idempotency, fork-guard]
dependency_graph:
  requires: [04-01]
  provides: [per-finding-commit-loop, findings-json-persistence, fork-guard, summary-with-sha]
  affects: [agents/pr-fixer.md, commands/pr-review/fix.md]
tech_stack:
  added: []
  patterns: [per-finding-git-commit, sha-capture-via-rev-parse, write-tool-persistence, fork-guard-via-IS_FORK]
key_files:
  created: []
  modified:
    - agents/pr-fixer.md
    - commands/pr-review/fix.md
decisions:
  - "Per-finding git commit uses git add <specific file> to avoid staging findings.json (D-01)"
  - "SHA captured via git rev-parse HEAD after confirmed commit — not parsed from commit output (D-11)"
  - "findings.json written after each fix via Write tool (not batched) for idempotency (FIX-08)"
  - "Fork guard IS_FORK!=true wraps entire git block — only edits applied for fork PRs (D-16)"
metrics:
  duration_minutes: 2
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
---

# Phase 04 Plan 02: Per-Finding Commit Loop and Findings Persistence Summary

One-liner: Per-finding git commit loop with SHA capture, fork guard, and immediate findings.json persistence added to fix agent.

## What Was Built

Added the commit-and-persist sub-steps to `agents/pr-fixer.md` Step 3 (apply_fixes) and updated Step 4 (report) with SHA display, plus aligned success criteria in both `agents/pr-fixer.md` and `commands/pr-review/fix.md`.

### Task 1: Step 3 commit loop and fork guard (commit `7134620`)

Added a "After each successful fix: commit and persist" subsection to Step 3 of `agents/pr-fixer.md` covering:

- **a. Git commit block:** `git add "[finding.file]"` → `git commit -m "fix(review): [finding.title]"` → `COMMIT_SHA=$(git rev-parse HEAD)` — staged only for non-fork PRs
- **b. Fork guard:** If `$IS_FORK` is `"true"`, skip all git commands and set COMMIT_SHA to null (per D-16)
- **c. findings.json persistence:** Mutate in-memory `finding.status = "resolved"` and `finding.commitHash = COMMIT_SHA`, then overwrite findings.json via Write tool after each fix
- **d. Per-finding output:** `✓ Fixed: [title] ([file]) → [SHA first 7]` for non-fork; `→ local only` for fork
- **e. Failure handling:** git commit failure → skip with reason, continue to next finding

Updated constraints: replaced "NEVER commit changes" with "One commit per finding when not a fork PR" and the full D-01/D-16 rule.

### Task 2: Step 4 summary and success criteria (commit `96cc7d4`)

Updated Step 4 to show `{commitHash first 7 chars}` and `local only` in the Fixed list, reference `--only N` for retry guidance (D-07), and conditionally omit the Skipped section if empty.

Added to `agents/pr-fixer.md` success_criteria:
- Each fixed finding has exactly one git commit with `fix(review): [title]`
- findings.json updated after each fix with status "resolved" and commitHash
- Re-running skips already-resolved findings (idempotent)
- Fork PRs: edits applied, findings.json updated, but no commits created

Added to `commands/pr-review/fix.md` process: steps 6e (stage + commit + capture SHA) and 6f (update findings.json with resolved status and commitHash).

Added to `commands/pr-review/fix.md` success_criteria: commit format, commitHash persistence, re-run idempotency, and skipped findings reporting.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Per-finding git commit uses specific file staging | Prevents findings.json from entering git history (D-01) |
| SHA captured via `git rev-parse HEAD` | More stable than parsing git commit output (Pitfall 3 from RESEARCH.md) |
| Write tool for findings.json (not node -e) | Cleaner, handles encoding, no shell escaping issues |
| findings.json written after each fix, not batched | Idempotency survives interrupted runs (FIX-08, D-08) |
| Fork guard wraps entire git block | D-16: fork edits are local-only, no commit hash produced |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all new logic is complete prose agent instructions with no placeholder values.

## Self-Check

### Files Exist

- FOUND: agents/pr-fixer.md
- FOUND: commands/pr-review/fix.md
- FOUND: .planning/phases/04-fix-engine/04-02-SUMMARY.md

### Commits Exist

- FOUND: 7134620 (Task 1)
- FOUND: 96cc7d4 (Task 2)

## Self-Check: PASSED
