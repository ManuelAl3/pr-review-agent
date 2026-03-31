---
phase: quick
plan: 260330-wv5
subsystem: agents
tags: [pr-reviewer, permissions, github, cli]
dependency_graph:
  requires: []
  provides: [permission-pre-check-step-4a1]
  affects: [agents/pr-reviewer.md]
tech_stack:
  added: []
  patterns: [gh-api-collaborators-endpoint, bash-permission-check]
key_files:
  created: []
  modified:
    - agents/pr-reviewer.md
decisions:
  - Labeled new substep as "Step 4a.1" to stay within the 4a guard block logically, avoiding renumbering of 4b-4h
  - Treat any gh api failure (404, network error, empty output) as "none" permission to fail safely
metrics:
  duration: 38s
  completed: 2026-03-30
  tasks_completed: 1
  files_modified: 1
---

# Phase quick Plan 260330-wv5: Add Permission Pre-Check to PR Reviewer Summary

**One-liner:** Permission pre-check substep (4a.1) using gh api collaborators endpoint, blocking comment posting for read-only users with a clear role message.

## What Was Built

Added a new substep `Step 4a.1: Permission Check` in `agents/pr-reviewer.md` between the `--post` guard check (Step 4a) and `Step 4b: Parse Diff Hunks`.

The check:
1. Gets the authenticated GitHub username via `gh api user --jq '.login'`
2. Checks the user's permission level via `gh api repos/${REPO}/collaborators/${GH_USER}/permission`
3. Allows `write`, `maintain`, and `admin` roles to proceed to Step 4b
4. On insufficient permission (or gh api failure), prints a clear message showing the actual role and required roles, then skips Step 4b through 4h

## Commits

| Hash | Description |
|------|-------------|
| ba67a1d | feat(quick-260330-wv5): add permission pre-check to pr-reviewer Step 4 |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] agents/pr-reviewer.md modified with Step 4a.1 inserted
- [x] Commit ba67a1d exists and contains 30 insertions
- [x] All original substep labels (Step 4b through 4h) unchanged
- [x] collaborators endpoint present in agents/pr-reviewer.md
- [x] write/maintain/admin allowed roles listed
