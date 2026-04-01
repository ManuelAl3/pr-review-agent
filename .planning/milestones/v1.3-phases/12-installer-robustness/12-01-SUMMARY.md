---
phase: 12-installer-robustness
plan: 01
subsystem: infra
tags: [installer, upgrade, cleanup, node, npm]

# Dependency graph
requires: []
provides:
  - cleanStaleFiles() helper in bin/install.js removes commands/pr-review dir and agent .md files before each install
  - Version detection prologue reads .version from prior install and shows upgrade message when versions differ
  - Re-install idempotence: same-version re-install shows no upgrade message, user data files are never touched
affects: [future-phases-using-installer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Version detection before copy: read .version from templateDest before any file operations, compare with VERSION constant"
    - "Cleanup-before-copy: remove stale commands and agent files before any new files are written"
    - "User data preservation: cleanStaleFiles omits pr-review/ directory to never touch findings.json, config.json, REVIEW-PLAN.md"

key-files:
  created: []
  modified:
    - bin/install.js

key-decisions:
  - "cleanStaleFiles omits pr-review/ from removal list to preserve user data (findings.json, config.json, REVIEW-PLAN.md)"
  - "Version detection reads .version BEFORE cleanStaleFiles call so prevVersion is known before cleanup runs"
  - "No per-file log output from cleanStaleFiles — silent cleanup keeps install output clean"
  - "Same-version re-install emits no upgrade message — only prevVersion !== VERSION triggers the log line"

patterns-established:
  - "Upgrade pattern: detect version → log upgrade if needed → clean stale files → copy new files → write new .version"

requirements-completed: [RTCOMPAT-03]

# Metrics
duration: 1min
completed: 2026-04-01
---

# Phase 12 Plan 01: Installer Robustness Summary

**cleanStaleFiles() helper added to bin/install.js that removes stale commands and agent files before each re-install, with version detection that shows an upgrade message only when the version changes — user data (findings.json, config.json) is never touched**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-01T20:26:10Z
- **Completed:** 2026-04-01T20:27:12Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `cleanStaleFiles(configDir)` function that silently removes `commands/pr-review`, `agents/pr-reviewer.md`, and `agents/pr-fixer.md` before any new files are copied
- Added version detection prologue in `install()` reading `.version` from prior install, showing upgrade message only when `prevVersion !== VERSION`
- Verified re-install idempotence: double install succeeds, user data files (`findings.json`, `config.json`) survive re-install, same-version re-install shows no upgrade message

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cleanStaleFiles helper function** - `957bdb3` (feat)
2. **Task 2: Verify re-install idempotence** - no code changes (verification-only task)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `bin/install.js` - Added `cleanStaleFiles()` function and version detection + cleanup prologue in `install()`

## Decisions Made
- `cleanStaleFiles` does not include `pr-review/` in the removal list — this preserves user data files (`findings.json`, `config.json`, `REVIEW-PLAN.md`) across re-installs
- Version detection is performed before `cleanStaleFiles` call so `prevVersion` is captured before any cleanup runs
- No per-file log output from `cleanStaleFiles` — silent cleanup keeps the install output focused on what was installed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Installer robustness complete for v1.3 milestone
- `cleanStaleFiles` is ready for any future file additions — just add to the `stale` array
- No blockers

## Self-Check: PASSED

- FOUND: bin/install.js
- FOUND: .planning/phases/12-installer-robustness/12-01-SUMMARY.md
- FOUND: commit 957bdb3 (feat(12-01): add cleanStaleFiles helper and upgrade detection to installer)

---
*Phase: 12-installer-robustness*
*Completed: 2026-04-01*
