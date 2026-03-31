---
phase: 05-github-bridge
plan: 02
subsystem: agent
tags: [gh-cli, github-api, pr-comments, reply, 422-fallback]

# Dependency graph
requires:
  - phase: 05-github-bridge
    plan: 01
    provides: "Step 5 push logic in pr-fixer.md; IS_FORK convention; push guard pattern"
provides:
  - "Step 6 reply_comments in pr-fixer.md: fork guard, reply targeting (D-12/D-13/D-14), gh api reply loop, 422 detection, batched fallback, reply summary"
  - "fix.md command updated with reply step 9 in process and two new success criteria"
affects: [06-review-agent-inline-comments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "gh api --method POST -f body= for inline reply to PR comment thread"
    - "grep '\"status\":\"422\"' on gh api stdout for 422 detection"
    - "gh pr comment for batched fallback (cannot produce 422)"
    - "failed422 array collect-then-post pattern (D-05/D-06/D-07)"

key-files:
  created: []
  modified:
    - agents/pr-fixer.md
    - commands/pr-review/fix.md

key-decisions:
  - "Reply loop only processes findings with BOTH status resolved AND non-null commentId (D-12)"
  - "422 detection via grep '\"status\":\"422\"' on gh api stdout — simpler than node -e JSON parse (per RESEARCH.md recommendation)"
  - "Batched fallback via gh pr comment (not gh api) — cannot produce 422, handles repo resolution automatically"
  - "No retry on failed replies — skip and report (D-11)"
  - "Fork PRs skip both push and replies (D-16) — IS_FORK guard at top of Step 6"

patterns-established:
  - "Collect-then-post: collect 422 failures in failed422 array, post ONE batched fallback after all attempts"
  - "Reply guard chain: fork guard -> no-fixes guard -> empty-targets guard -> reply loop"
  - "D-13/D-14 print pattern: always print reply target count, print explicit skip message when zero targets"

requirements-completed: [GH-04, GH-05]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 05 Plan 02: GitHub Bridge Reply Comments Summary

**Step 6 reply_comments added to pr-fixer.md: gh api inline reply loop with 422 collect-then-post batched fallback via gh pr comment**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-31T03:37:24Z
- **Completed:** 2026-03-31T03:39:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `<step name="reply_comments">` (Step 6) to pr-fixer.md with complete reply loop, fork guard, reply target identification (D-12/D-13/D-14), 422 detection, batched fallback, and reply summary
- Updated fix.md command with step 9 (Reply to inline comment threads) in process list and two new success criteria
- All locked decisions (D-01 through D-16) honored in implementation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Step 6 reply_comments logic to pr-fixer.md** - `3f7546d` (feat)
2. **Task 2: Update fix.md command process with reply step** - `b572544` (feat)

**Plan metadata:** committed with docs commit below

## Files Created/Modified
- `agents/pr-fixer.md` - Added Step 6 reply_comments with fork guard, reply targeting, gh api reply loop, 422 detection, batched fallback, reply summary, and three new success criteria entries
- `commands/pr-review/fix.md` - Added step 9 in process section and two new success criteria

## Decisions Made
- Used `grep '"status":"422"'` for 422 detection (simpler string grep recommended in RESEARCH.md over node -e JSON parse)
- Batched fallback uses `gh pr comment` (not `gh api`) — cannot produce 422, simpler, handles repo resolution automatically
- Reply guard chain follows fork guard -> no-fixes guard -> empty-targets guard pattern consistent with Step 5 push

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 05 (GitHub Bridge) is now complete: push step (Plan 01) + reply step (Plan 02)
- Phase 06 (Review Agent Inline Comments) will populate `commentId` fields in findings.json — the reply loop in Step 6 is already wired to consume them
- Note: Step 6 will print "Replies: No inline comments to reply to" until Phase 06 ships the review agent that sets commentId values

---
*Phase: 05-github-bridge*
*Completed: 2026-03-31*
