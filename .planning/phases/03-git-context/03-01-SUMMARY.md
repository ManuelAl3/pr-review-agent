---
phase: 03-git-context
plan: 01
subsystem: fix-agent
tags: [git-context, pre-flight, safety-gate, fork-detection, branch-checkout]
dependency_graph:
  requires: []
  provides: [pre-flight-safety-gate, IS_FORK-convention]
  affects: [agents/pr-fixer.md, commands/pr-review/fix.md]
tech_stack:
  added: []
  patterns: [pre-flight-gate, dirty-tree-check, fork-detection-via-gh-cli]
key_files:
  created: []
  modified:
    - agents/pr-fixer.md
    - commands/pr-review/fix.md
decisions:
  - "Pre-flight gate is Step 0 — runs before load_findings — so all file reads happen on the correct branch"
  - "IS_FORK stored as string 'true'/'false' for downstream phase 4/5 consumption"
  - "Dirty tree check uses grep -v '^??' to ignore untracked files (safe for branch switching)"
  - "Branch checkout skipped silently when already on correct branch (D-02 zero friction for re-runs)"
metrics:
  duration: 1 minute
  completed: "2026-03-31"
  tasks_completed: 2
  files_modified: 2
requirements:
  - FIX-01
  - FIX-02
  - FIX-07
---

# Phase 03 Plan 01: Pre-flight Safety Gate Summary

**One-liner:** Pre-flight step (Step 0) in pr-fixer.md that reads config.json, checks dirty tree via `git status --porcelain`, conditionally runs `gh pr checkout`, and detects fork PRs via `gh pr view --json isCrossRepository` before any file is touched.

## What Was Built

Added a new `pre_flight` step (Step 0) to `agents/pr-fixer.md` that acts as a safety gate before the fix agent touches any files. The step covers four sub-checks:

- **0a. Load PR metadata** — reads `config.json` for `pr.number` and `pr.head`; aborts with terse error if missing
- **0b. Dirty tree check** — runs `git status --porcelain | grep -v '^??'`; aborts if tracked changes detected (untracked ignored)
- **0c. Branch checkout** — compares current branch to `pr.head`; runs `gh pr checkout $PR_NUMBER` only if branches differ; silent no-op if already correct
- **0d. Fork detection** — runs `gh pr view $PR_NUMBER --json isCrossRepository --jq '.isCrossRepository'`; stores `$IS_FORK`; prints warning for fork PRs

Also updated `commands/pr-review/fix.md` to reflect the gate in the user-facing process section.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add pre-flight safety gate step to pr-fixer.md | 6c7f460 | agents/pr-fixer.md |
| 2 | Update fix.md process to reflect pre-flight gate | 1cf3416 | commands/pr-review/fix.md |

## Decisions Made

1. **Pre-flight is Step 0** — Existing steps stay at 1-4; new step inserts before them. All file reads happen on the correct branch.
2. **IS_FORK convention established** — Stored as bash string `"true"`/`"false"` for downstream phases (Phase 4 commits, Phase 5 push/reply) to reference.
3. **Dirty tree filter pattern** — `grep -v '^??'` excludes untracked files, matching the decision that untracked files do not affect branch switching safety.
4. **Silent skip on correct branch** — Zero friction for re-runs (D-02): no message, no `gh pr checkout` call when already on the right branch.

## Deviations from Plan

None — plan executed exactly as written. All 10 locked decisions (D-01 through D-10) honored. Both acceptance criteria checklists pass fully.

## Known Stubs

None. The pre-flight step is fully specified in the agent markdown. It will be exercised when Phase 4 (commit loop) and Phase 5 (push/reply) are built.

## Self-Check: PASSED

Files exist:
- agents/pr-fixer.md — modified with pre_flight step
- commands/pr-review/fix.md — modified with pre-flight process steps

Commits exist:
- 6c7f460 feat(03-01): add pre-flight safety gate step to pr-fixer.md
- 1cf3416 feat(03-01): update fix.md process to reflect pre-flight gate
